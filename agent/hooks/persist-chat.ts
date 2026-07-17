import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import type { Value } from "convex/values";
import type { HandleMessageStreamEvent } from "eve/client";
import { defineHook, type HookContext } from "eve/hooks";

import { toClientContinuationToken } from "@/lib/eve-session";

type SequencedEvent = HandleMessageStreamEvent & {
  data?: {
    sequence?: number;
    stepIndex?: number;
    turnId?: string;
  };
};

type PersistEventArgs = {
  continuationToken?: string;
  event: Value;
  eventKey: string;
  eveSessionId: string;
  secret: string;
  streamAdvance: number;
};

type PendingAppend = {
  ctx: HookContext;
  event: HandleMessageStreamEvent;
  streamAdvance: number;
  readonly timeout: ReturnType<typeof setTimeout>;
};

const APPEND_INTERVAL_MS = 1_000;
const persistEventMutation = makeFunctionReference<"mutation", PersistEventArgs, null>(
  "persistence:persistEvent",
);

let client: ConvexHttpClient | undefined;
const pendingAppends = new Map<string, PendingAppend>();
const persistenceQueues = new Map<string, Promise<void>>();

export function getEventKey(event: HandleMessageStreamEvent): string {
  const data = (event as SequencedEvent).data;

  return [
    event.type,
    data?.turnId ?? "session",
    data?.sequence ?? "-",
    data?.stepIndex ?? "-",
    event.meta?.at ?? "-",
  ].join(":");
}

export function getSessionEventKey(sessionId: string, event: HandleMessageStreamEvent): string {
  return `${sessionId}:${getEventKey(event)}`;
}

export function toSerializableEvent(event: HandleMessageStreamEvent): Value {
  return JSON.parse(JSON.stringify(event)) as Value;
}

function getClient(): { client: ConvexHttpClient; secret: string } {
  const convexUrl = process.env.VITE_CONVEX_URL;
  const secret = process.env.EVE_HOOK_SECRET;

  if (!convexUrl) {
    throw new Error("VITE_CONVEX_URL is required.");
  }

  if (!secret) {
    throw new Error("EVE_HOOK_SECRET is required.");
  }

  client ??= new ConvexHttpClient(convexUrl);
  return { client, secret };
}

function enqueueEvent(event: HandleMessageStreamEvent, ctx: HookContext, streamAdvance = 1) {
  const sessionId = ctx.session.id;
  const pending = (persistenceQueues.get(sessionId) ?? Promise.resolve())
    .then(async () => {
      const persistence = getClient();
      await persistence.client.mutation(persistEventMutation, {
        continuationToken: toClientContinuationToken(ctx.channel.continuationToken),
        event: toSerializableEvent(event),
        eventKey: getSessionEventKey(sessionId, event),
        eveSessionId: sessionId,
        secret: persistence.secret,
        streamAdvance,
      });
    })
    .catch((error) => console.error("Could not persist Eve event", error));

  persistenceQueues.set(sessionId, pending);
  void pending.finally(() => {
    if (persistenceQueues.get(sessionId) === pending) persistenceQueues.delete(sessionId);
  });

  return pending;
}

function flushAppend(sessionId: string): void {
  const pending = pendingAppends.get(sessionId);
  if (!pending) return;

  clearTimeout(pending.timeout);
  pendingAppends.delete(sessionId);
  enqueueEvent(pending.event, pending.ctx, pending.streamAdvance);
}

function handleEvent(event: HandleMessageStreamEvent, ctx: HookContext) {
  const sessionId = ctx.session.id;
  const isAppend = event.type === "message.appended" || event.type === "reasoning.appended";

  if (!isAppend) {
    flushAppend(sessionId);
    return enqueueEvent(event, ctx);
  }

  const previous = pendingAppends.get(sessionId);
  if (previous) {
    previous.ctx = ctx;
    previous.event = event;
    previous.streamAdvance += 1;
    return;
  }

  const timeout = setTimeout(() => flushAppend(sessionId), APPEND_INTERVAL_MS);
  pendingAppends.set(sessionId, { ctx, event, streamAdvance: 1, timeout });
}

export default defineHook({
  events: {
    "*": handleEvent,
  },
});
