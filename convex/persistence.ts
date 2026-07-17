import { ConvexError, v } from "convex/values";
import { advanceChatLifecycle, deriveChatTitle } from "../lib/chat-logic";
import type { Doc } from "./_generated/dataModel";
import { type MutationCtx, mutation } from "./_generated/server";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

type ChatSession = {
  readonly continuationToken?: string;
  readonly eveSessionId: string;
};

async function getOrCreateChat(
  ctx: MutationCtx,
  session: ChatSession,
  createdAt: number,
): Promise<Doc<"chats">> {
  const existing = await ctx.db
    .query("chats")
    .withIndex("by_eve_session", (q) => q.eq("eveSessionId", session.eveSessionId))
    .unique();
  if (existing) return existing;

  const chatId = await ctx.db.insert("chats", {
    continuationToken: session.continuationToken,
    createdAt,
    eveSessionId: session.eveSessionId,
    revision: 0,
    status: "running",
    streamIndex: 0,
    title: "New chat",
    updatedAt: createdAt,
  });
  const chat = await ctx.db.get(chatId);
  if (!chat) throw new ConvexError("Could not create chat.");
  return chat;
}

export const persistEvent = mutation({
  args: {
    continuationToken: v.optional(v.string()),
    event: v.any(),
    eventKey: v.string(),
    eveSessionId: v.string(),
    secret: v.string(),
    streamAdvance: v.number(),
  },
  handler: async (ctx, args) => {
    if (!process.env.EVE_HOOK_SECRET || args.secret !== process.env.EVE_HOOK_SECRET) {
      throw new ConvexError("Invalid eve persistence secret.");
    }

    if (!isRecord(args.event) || typeof args.event.type !== "string") {
      throw new ConvexError("Invalid eve event.");
    }
    const eventTime = isRecord(args.event.meta) ? Date.parse(String(args.event.meta.at)) : NaN;
    const createdAt = Number.isFinite(eventTime) ? eventTime : Date.now();
    const chat = await getOrCreateChat(ctx, args, createdAt);
    const chatId = chat._id;

    const existing = await ctx.db
      .query("events")
      .withIndex("by_chat_and_event", (q) => q.eq("chatId", chatId).eq("eventKey", args.eventKey))
      .unique();

    if (existing) {
      await ctx.db.patch(chatId, { continuationToken: args.continuationToken });
      return null;
    }

    await ctx.db.insert("events", {
      chatId,
      createdAt,
      eveSessionId: args.eveSessionId,
      event: args.event,
      eventKey: args.eventKey,
      index: chat.streamIndex + args.streamAdvance - 1,
    });

    const lifecycle = advanceChatLifecycle(args.event.type, chat.revision);
    await ctx.db.patch(chatId, {
      continuationToken: args.continuationToken,
      revision: lifecycle.revision,
      status: lifecycle.status,
      streamIndex: chat.streamIndex + args.streamAdvance,
      updatedAt: createdAt,
    });

    const message = isRecord(args.event.data) ? args.event.data.message : undefined;
    if (typeof message !== "string" || chat.title !== "New chat") return null;

    await ctx.db.patch(chatId, { title: deriveChatTitle(message) });

    return null;
  },
});
