import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import eve from "./lib/vite-plugin-eve";

const evePort = Number(process.env.EVE_PORT ?? 4879);
const rootDirectory = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: "app",
  envDir: "..",
  plugins: [eve({ port: evePort }), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": rootDirectory,
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react",
              test: /node_modules\/(?:react|react-dom|react-router|scheduler)\//,
            },
            {
              name: "chat-runtime",
              test: /node_modules\/(?:convex|eve)\//,
            },
          ],
        },
      },
    },
  },
});
