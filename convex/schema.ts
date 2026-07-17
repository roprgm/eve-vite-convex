import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  chats: defineTable({
    continuationToken: v.optional(v.string()),
    createdAt: v.number(),
    eveSessionId: v.string(),
    revision: v.number(),
    status: v.union(v.literal("ready"), v.literal("running"), v.literal("error")),
    streamIndex: v.number(),
    title: v.string(),
    updatedAt: v.number(),
  })
    .index("by_eve_session", ["eveSessionId"])
    .index("by_updated_at", ["updatedAt"]),

  events: defineTable({
    chatId: v.id("chats"),
    createdAt: v.number(),
    eveSessionId: v.string(),
    event: v.any(),
    eventKey: v.string(),
    index: v.number(),
  })
    .index("by_chat", ["chatId"])
    .index("by_chat_and_index", ["chatId", "index"])
    .index("by_chat_and_event", ["chatId", "eventKey"]),
});
