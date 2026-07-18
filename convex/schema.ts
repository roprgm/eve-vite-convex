import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const storedEvent = v.object({ event: v.any(), index: v.number() });

export default defineSchema({
  chats: defineTable({
    chatId: v.string(),
    continuationToken: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    status: v.union(v.literal("ready"), v.literal("running"), v.literal("error")),
    streamIndex: v.number(),
    title: v.string(),
    updatedAt: v.number(),
  })
    .index("by_chat_id", ["chatId"])
    .index("by_session_id", ["sessionId"])
    .index("by_updated_at", ["updatedAt"]),

  turns: defineTable({
    chatId: v.string(),
    events: v.array(storedEvent),
    searchText: v.string(),
    streamIndex: v.number(),
    turnId: v.string(),
  })
    .index("by_chat_and_stream_index", ["chatId", "streamIndex"])
    .index("by_chat_and_turn", ["chatId", "turnId"])
    .searchIndex("search_text", { searchField: "searchText", filterFields: ["chatId"] }),
});
