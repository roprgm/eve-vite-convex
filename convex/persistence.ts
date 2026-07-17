import { ConvexError, v } from "convex/values";
import { advanceChatLifecycle, deriveChatTitle, parseMessageEvent } from "../lib/chat-logic";
import { mutation } from "./_generated/server";

function eventTime(event: { meta?: { at: string } }): number {
  const timestamp = event.meta ? Date.parse(event.meta.at) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

export const persistEvent = mutation({
  args: {
    continuationToken: v.optional(v.string()),
    event: v.any(),
    eventKey: v.string(),
    eventType: v.string(),
    eveSessionId: v.string(),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.EVE_HOOK_SECRET || args.secret !== process.env.EVE_HOOK_SECRET) {
      throw new ConvexError("Invalid eve persistence secret.");
    }

    const parsedEvent = parseMessageEvent(args.event);
    const createdAt = parsedEvent ? eventTime(parsedEvent) : Date.now();
    let chat = await ctx.db
      .query("chats")
      .withIndex("by_eve_session", (q) => q.eq("eveSessionId", args.eveSessionId))
      .unique();

    if (!chat) {
      const chatId = await ctx.db.insert("chats", {
        continuationToken: args.continuationToken,
        createdAt,
        eveSessionId: args.eveSessionId,
        revision: 0,
        status: "running",
        streamIndex: 0,
        title: "New chat",
        updatedAt: createdAt,
      });
      chat = await ctx.db.get(chatId);
    }

    if (!chat) throw new ConvexError("Could not create chat.");
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
      index: chat.streamIndex,
    });

    const lifecycle = advanceChatLifecycle(args.eventType, chat.revision ?? 0);
    await ctx.db.patch(chatId, {
      continuationToken: args.continuationToken,
      revision: lifecycle.revision,
      status: lifecycle.status,
      streamIndex: chat.streamIndex + 1,
      updatedAt: createdAt,
    });

    if (args.eventType !== "message.received") {
      return null;
    }

    const message = parsedEvent?.data.message;
    if (!message || chat.title !== "New chat") return null;

    await ctx.db.patch(chatId, { title: deriveChatTitle(message) });

    return null;
  },
});
