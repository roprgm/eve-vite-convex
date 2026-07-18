import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { isPublicChatId } from "../lib/chat-identity";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";

const DELETE_BATCH_SIZE = 100;
export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const result = await ctx.db
      .query("chats")
      .withIndex("by_updated_at")
      .order("desc")
      .paginate(paginationOpts);
    return {
      ...result,
      page: result.page.map(({ chatId, status, title }) => ({ chatId, status, title })),
    };
  },
});

export const get = query({
  args: { chatId: v.string() },
  handler: async (ctx, { chatId }) => {
    if (!isPublicChatId(chatId)) return null;
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_chat_id", (index) => index.eq("chatId", chatId))
      .unique();
    if (!chat) return null;
    const turns = await ctx.db
      .query("turns")
      .withIndex("by_chat_and_stream_index", (index) => index.eq("chatId", chatId))
      .collect();
    return {
      chat: {
        continuationToken: chat.continuationToken,
        sessionId: chat.sessionId,
        status: chat.status,
        streamIndex: chat.streamIndex,
        title: chat.title,
      },
      events: turns.flatMap(({ events }) => events),
    };
  },
});

export const create = mutation({
  args: { chatId: v.string(), message: v.string() },
  handler: async (ctx, { chatId, message }) => {
    if (!isPublicChatId(chatId)) throw new ConvexError("Invalid chat id.");
    const existing = await ctx.db
      .query("chats")
      .withIndex("by_chat_id", (index) => index.eq("chatId", chatId))
      .unique();
    if (existing) throw new ConvexError("Chat already exists.");

    const id = await ctx.db.insert("chats", {
      chatId,
      status: "ready",
      streamIndex: 0,
      title: "New chat",
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.title.generate, {
      id,
      message: message.slice(0, 4_000),
    });
  },
});

export const rename = mutation({
  args: { chatId: v.string(), title: v.string() },
  handler: async (ctx, { chatId, title }) => {
    if (!isPublicChatId(chatId)) throw new ConvexError("Chat not found.");
    const nextTitle = title.replace(/\s+/g, " ").trim();
    if (!nextTitle) throw new ConvexError("Chat title cannot be empty.");
    if (nextTitle.length > 100) throw new ConvexError("Chat title is too long.");

    const chat = await ctx.db
      .query("chats")
      .withIndex("by_chat_id", (index) => index.eq("chatId", chatId))
      .unique();
    if (!chat) throw new ConvexError("Chat not found.");
    await ctx.db.patch(chat._id, { title: nextTitle });
  },
});

export const remove = mutation({
  args: { chatId: v.string() },
  handler: async (ctx, { chatId }) => {
    if (!isPublicChatId(chatId)) throw new ConvexError("Chat not found.");
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_chat_id", (index) => index.eq("chatId", chatId))
      .unique();
    if (!chat) return;
    if (chat.status === "running") throw new ConvexError("Stop this chat before deleting it.");

    await ctx.db.delete(chat._id);
    await ctx.scheduler.runAfter(0, internal.chats.removeTurns, { chatId });
  },
});

export const removeTurns = internalMutation({
  args: { chatId: v.string() },
  handler: async (ctx, { chatId }) => {
    const turns = await ctx.db
      .query("turns")
      .withIndex("by_chat_and_stream_index", (index) => index.eq("chatId", chatId))
      .take(DELETE_BATCH_SIZE);
    await Promise.all(turns.map((turn) => ctx.db.delete(turn._id)));
    if (turns.length === DELETE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.chats.removeTurns, { chatId });
    }
  },
});
