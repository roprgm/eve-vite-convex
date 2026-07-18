import { getVercelOidcToken } from "@vercel/oidc";
import { ConvexHttpClient } from "convex/browser";
import { Client, type HandleMessageStreamEvent } from "eve/client";
import { defineHook, type HookContext } from "eve/hooks";

import { api } from "@/convex/_generated/api";
import { CHAT_ID_ATTRIBUTE, isPublicChatId } from "@/lib/chat-identity";
import { compactTurn } from "@/lib/eve-checkpoint";

type BoundaryEvent = Extract<
  HandleMessageStreamEvent,
  { type: "session.completed" | "session.failed" | "session.waiting" }
>;
function persistenceClient() {
  const convexUrl = process.env.VITE_CONVEX_URL;
  const secret = process.env.EVE_HOOK_SECRET;
  if (!convexUrl || !secret) throw new Error("Convex persistence is not configured.");
  return { client: new ConvexHttpClient(convexUrl), secret };
}

function replayClient(): Client {
  const deploymentUrl = process.env.VERCEL_URL;
  if (!deploymentUrl) return new Client({ host: "http://127.0.0.1:4879" });
  return new Client({
    auth: { vercelOidc: { token: getVercelOidcToken } },
    host: `https://${deploymentUrl}`,
    redirect: "error",
  });
}

function initiatorAttribute(ctx: HookContext, name: string): string | undefined {
  const value = ctx.session.auth.initiator?.attributes[name];
  if (typeof value === "string") return value;
}
async function beginTurn(
  _event: Extract<HandleMessageStreamEvent, { type: "turn.started" }>,
  ctx: HookContext,
): Promise<void> {
  if (ctx.session.parent) return;
  const chatId = initiatorAttribute(ctx, CHAT_ID_ATTRIBUTE);
  if (!isPublicChatId(chatId)) return;

  const persistence = persistenceClient();
  await persistence.client.mutation(api.persistence.beginTurn, {
    chatId,
    secret: persistence.secret,
    sessionId: ctx.session.id,
    startedAt: Date.now(),
  });
}

async function commitTurn(event: BoundaryEvent, ctx: HookContext): Promise<void> {
  if (ctx.session.parent) return;
  const chatId = initiatorAttribute(ctx, CHAT_ID_ATTRIBUTE);
  if (!isPublicChatId(chatId)) return;

  const persistence = persistenceClient();
  const turnId = ctx.session.turn.id;
  const replayState = await persistence.client.query(api.persistence.replayState, {
    chatId,
    secret: persistence.secret,
    sessionId: ctx.session.id,
    turnId,
  });
  if (replayState.deleted) return;
  if (replayState.committed) return;

  const session = replayClient().session({
    sessionId: ctx.session.id,
    streamIndex: replayState.streamIndex,
  });
  const replay: HandleMessageStreamEvent[] = [];
  for await (const item of session.stream({ startIndex: replayState.streamIndex })) {
    replay.push(item);
    if (item.type === event.type) break;
  }
  const checkpoint = compactTurn(replay, replayState.streamIndex);
  if (checkpoint.turnId !== turnId) throw new Error("Eve replay returned a different turn.");
  let continuationToken: string | undefined;
  if (event.type === "session.waiting") continuationToken = event.data.continuationToken;

  await persistence.client.mutation(api.persistence.commitTurn, {
    chatId,
    completedAt: Date.now(),
    continuationToken,
    events: checkpoint.events,
    searchText: checkpoint.searchText.slice(0, 100_000),
    secret: persistence.secret,
    sessionId: ctx.session.id,
    status: checkpoint.status,
    streamIndex: checkpoint.streamIndex,
    turnId,
  });
}

export default defineHook({
  events: {
    "session.completed": commitTurn,
    "session.failed": commitTurn,
    "session.waiting": commitTurn,
    "turn.started": beginTurn,
  },
});
