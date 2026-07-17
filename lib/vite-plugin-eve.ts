import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type { Plugin, ViteDevServer } from "vite";

const defaultPort = 4879;

export interface EvePluginOptions {
  root?: string;
  port?: number;
}

class EveDevServer {
  readonly origin: string;

  private readonly root: string;
  private readonly port: number;
  private readonly statePath: string;
  private child?: ChildProcess;
  private stopped = false;

  constructor({ root, port }: Required<EvePluginOptions>) {
    this.root = root;
    this.port = port;
    this.origin = `http://127.0.0.1:${port}`;
    this.statePath = resolve(root, ".eve/dev-server-state.v1.json");
  }

  async start(server: ViteDevServer): Promise<void> {
    await this.clearMismatchedState();

    if (await this.isHealthy()) {
      server.config.logger.info(`[eve] reusing dev server at ${this.origin}`);

      while (!this.stopped && (await this.isHealthy())) {
        await delay(1_500);
      }

      if (!this.stopped) {
        server.config.logger.info("[eve] dev server stopped; starting a replacement");
      }
    }

    if (!this.stopped) {
      await this.spawn();
    }
  }

  stop(): void {
    this.stopped = true;
    this.child?.kill("SIGTERM");
  }

  private async recordedOrigin(): Promise<string | undefined> {
    try {
      const state = JSON.parse(await readFile(this.statePath, "utf8")) as { url?: unknown };
      return typeof state.url === "string" ? new URL(state.url).origin : undefined;
    } catch {
      return undefined;
    }
  }

  private async isHealthy(): Promise<boolean> {
    if ((await this.recordedOrigin()) !== this.origin) return false;

    try {
      const response = await fetch(`${this.origin}/eve/v1/health`, {
        signal: AbortSignal.timeout(1_000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async clearMismatchedState(): Promise<void> {
    const recordedOrigin = await this.recordedOrigin();
    if (recordedOrigin && recordedOrigin !== this.origin) {
      await rm(this.statePath, { force: true });
    }
  }

  private async spawn(): Promise<void> {
    const require = createRequire(import.meta.url);
    const evePackage = require.resolve("eve/package.json");
    const eveBinary = resolve(dirname(evePackage), "bin/eve.js");
    const child = spawn(
      process.execPath,
      [eveBinary, "dev", "--port", String(this.port), "--no-ui"],
      {
        cwd: this.root,
        env: process.env,
        stdio: "inherit",
      },
    );

    this.child = child;

    try {
      const [exitCode, signal] = (await once(child, "exit")) as [
        number | null,
        NodeJS.Signals | null,
      ];

      if (!this.stopped) {
        throw new Error(
          `eve dev exited unexpectedly (code ${String(exitCode)}, signal ${String(signal)})`,
        );
      }
    } finally {
      if (this.child === child) this.child = undefined;
    }
  }
}

export default function eve(options: EvePluginOptions = {}): Plugin {
  const root = resolve(options.root ?? process.cwd());
  const port = options.port ?? defaultPort;

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid eve port: ${String(port)}`);
  }

  const devServer = new EveDevServer({ root, port });

  return {
    name: "eve:dev",
    apply: "serve",
    config: () => ({
      server: {
        proxy: {
          "/eve": {
            changeOrigin: true,
            target: devServer.origin,
          },
        },
      },
    }),
    configureServer(server) {
      void devServer.start(server).catch((error: unknown) => {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        server.config.logger.error(`[eve] ${normalizedError.message}`, { error: normalizedError });
        process.exitCode = 1;
        void server.close();
      });
    },
    closeBundle() {
      devServer.stop();
    },
  };
}
