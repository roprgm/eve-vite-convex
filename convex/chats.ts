import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";

const DELETE_BATCH_SIZE = 100;
const CHAT_EVENT_LIMIT = 1_000;

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: (ctx, { paginationOpts }) =>
    ctx.db.query("chats").withIndex("by_updated_at").order("desc").paginate(paginationOpts),
});

export const getByEveSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) =>
    (
      await ctx.db
        .query("chats")
        .withIndex("by_eve_session", (q) => q.eq("eveSessionId", sessionId))
        .unique()
    )?._id ?? null,
});

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const chatId = ctx.db.normalizeId("chats", id);
    const chat = chatId ? await ctx.db.get(chatId) : null;
    if (!chat) return null;

    const eventWindow = await ctx.db
      .query("events")
      .withIndex("by_chat_and_index", (q) => q.eq("chatId", chat._id))
      .order("desc")
      .take(CHAT_EVENT_LIMIT + 1);
    const historyTruncated = eventWindow.length > CHAT_EVENT_LIMIT;
    const events = eventWindow.slice(0, CHAT_EVENT_LIMIT).reverse();

    return { chat, events, historyTruncated };
  },
});

export const stop = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_eve_session", (q) => q.eq("eveSessionId", sessionId))
      .unique();
    if (chat) {
      await ctx.db.patch(chat._id, {
        resumeAfterStop: true,
        status: "ready",
        updatedAt: Date.now(),
      });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("chats") },
  handler: async (ctx, { id }) => {
    const chat = await ctx.db.get(id);
    if (!chat) return;
    if (chat.status === "running") {
      throw new ConvexError("Wait for this chat to finish before deleting it.");
    }

    await ctx.db.delete(id);
    await ctx.scheduler.runAfter(0, internal.chats.removeData, { id });
  },
});

export const removeData = internalMutation({
  args: { id: v.id("chats") },
  handler: async (ctx, { id }) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_chat", (q) => q.eq("chatId", id))
      .take(DELETE_BATCH_SIZE);

    await Promise.all(events.map((event) => ctx.db.delete(event._id)));

    if (events.length === DELETE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.chats.removeData, { id });
    }
  },
});
