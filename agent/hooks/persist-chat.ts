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
  eventType: string;
  eveSessionId: string;
  secret: string;
};

const persistEvent = makeFunctionReference<"mutation", PersistEventArgs, null>(
  "messages:persistEvent",
);

let client: ConvexHttpClient | undefined;

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
  const convexUrl = process.env.CONVEX_URL ?? process.env.VITE_CONVEX_URL;
  const secret = process.env.EVE_HOOK_SECRET;
  if (!convexUrl || !secret) {
    throw new Error("CONVEX_URL (or VITE_CONVEX_URL) and EVE_HOOK_SECRET are required.");
  }

  client ??= new ConvexHttpClient(convexUrl);
  return { client, secret };
}

async function persist(event: HandleMessageStreamEvent, ctx: HookContext) {
  const persistence = getClient();

  await persistence.client.mutation(persistEvent, {
    continuationToken: toClientContinuationToken(ctx.channel.continuationToken),
    event: toSerializableEvent(event),
    eventKey: getSessionEventKey(ctx.session.id, event),
    eventType: event.type,
    eveSessionId: ctx.session.id,
    secret: persistence.secret,
  });
}

export default defineHook({
  events: {
    "*": persist,
  },
});
