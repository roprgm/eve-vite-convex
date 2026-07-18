import { ConvexError, v } from "convex/values";

import { isPublicChatId } from "../lib/chat-identity";
import { env, mutation, type QueryCtx, query } from "./_generated/server";

const identity = { chatId: v.string(), secret: v.string(), sessionId: v.string() };
const event = v.object({ event: v.any(), index: v.number() });
function authorize(chatId: string, secret: string): void {
  if (secret === env.EVE_HOOK_SECRET && isPublicChatId(chatId)) return;
  throw new ConvexError("Invalid Eve persistence request.");
}

async function getChat(ctx: Pick<QueryCtx, "db">, chatId: string, sessionId: string) {
  const chat = await ctx.db
    .query("chats")
    .withIndex("by_chat_id", (index) => index.eq("chatId", chatId))
    .unique();
  if (chat?.sessionId && chat.sessionId !== sessionId) {
    throw new ConvexError("Chat id conflict.");
  }
  return chat;
}

function getTurn(ctx: Pick<QueryCtx, "db">, chatId: string, turnId: string) {
  return ctx.db
    .query("turns")
    .withIndex("by_chat_and_turn", (index) => index.eq("chatId", chatId).eq("turnId", turnId))
    .unique();
}
export const replayState = query({
  args: { ...identity, turnId: v.string() },
  handler: async (ctx, args) => {
    authorize(args.chatId, args.secret);
    const chat = await getChat(ctx, args.chatId, args.sessionId);
    if (!chat) return { committed: false, deleted: true, streamIndex: 0 };
    const turn = await getTurn(ctx, args.chatId, args.turnId);
    return { committed: Boolean(turn), deleted: false, streamIndex: chat.streamIndex };
  },
});

export const beginTurn = mutation({
  args: { ...identity, startedAt: v.number() },
  handler: async (ctx, args) => {
    authorize(args.chatId, args.secret);
    const chat = await getChat(ctx, args.chatId, args.sessionId);
    if (!chat) return;
    await ctx.db.patch(chat._id, {
      sessionId: args.sessionId,
      status: "running",
      updatedAt: Math.max(chat.updatedAt, args.startedAt),
    });
  },
});

export const commitTurn = mutation({
  args: {
    ...identity,
    completedAt: v.number(),
    continuationToken: v.optional(v.string()),
    events: v.array(event),
    searchText: v.string(),
    status: v.union(v.literal("ready"), v.literal("error")),
    streamIndex: v.number(),
    turnId: v.string(),
  },
  handler: async (ctx, args) => {
    authorize(args.chatId, args.secret);
    const chat = await getChat(ctx, args.chatId, args.sessionId);
    if (!chat) return;
    const existing = await getTurn(ctx, args.chatId, args.turnId);
    if (existing) return;

    if (args.streamIndex <= chat.streamIndex) {
      throw new ConvexError("Stream cursor did not advance.");
    }
    await ctx.db.insert("turns", {
      chatId: args.chatId,
      events: args.events,
      searchText: args.searchText,
      streamIndex: args.streamIndex,
      turnId: args.turnId,
    });
    await ctx.db.patch(chat._id, {
      continuationToken: args.continuationToken,
      status: args.status,
      streamIndex: args.streamIndex,
      updatedAt: Math.max(chat.updatedAt, args.completedAt),
    });
  },
});
