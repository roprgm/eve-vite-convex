import { ConvexError, v } from "convex/values";
import {
  advanceChatLifecycle,
  deriveChatTitle,
  parseEventType,
  parseMessageEvent,
} from "../lib/chat-logic";
import type { Doc } from "./_generated/dataModel";
import { type MutationCtx, mutation } from "./_generated/server";

function eventTime(event: { meta?: { at: string } }): number {
  const timestamp = event.meta ? Date.parse(event.meta.at) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : Date.now();
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

  const resumed = session.continuationToken
    ? await ctx.db
        .query("chats")
        .withIndex("by_continuation_token", (q) =>
          q.eq("continuationToken", session.continuationToken),
        )
        .unique()
    : null;
  if (resumed?.resumeAfterStop) {
    await ctx.db.patch(resumed._id, {
      eveSessionId: session.eveSessionId,
      resumeAfterStop: false,
      sessionStreamIndex: 0,
    });
    return {
      ...resumed,
      eveSessionId: session.eveSessionId,
      resumeAfterStop: false,
      sessionStreamIndex: 0,
    };
  }

  const chatId = await ctx.db.insert("chats", {
    continuationToken: session.continuationToken,
    createdAt,
    eveSessionId: session.eveSessionId,
    revision: 0,
    sessionStreamIndex: 0,
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
  },
  handler: async (ctx, args) => {
    if (!process.env.EVE_HOOK_SECRET || args.secret !== process.env.EVE_HOOK_SECRET) {
      throw new ConvexError("Invalid eve persistence secret.");
    }

    const eventType = parseEventType(args.event);
    if (!eventType) throw new ConvexError("Invalid eve event.");
    const parsedEvent = parseMessageEvent(args.event);
    const createdAt = parsedEvent ? eventTime(parsedEvent) : Date.now();
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
      index: chat.streamIndex,
    });

    const lifecycle = advanceChatLifecycle(eventType, chat.revision);
    await ctx.db.patch(chatId, {
      continuationToken: args.continuationToken,
      revision: lifecycle.revision,
      sessionStreamIndex: (chat.sessionStreamIndex ?? chat.streamIndex) + 1,
      status: lifecycle.status,
      streamIndex: chat.streamIndex + 1,
      updatedAt: createdAt,
    });

    if (eventType !== "message.received") {
      return null;
    }

    const message = parsedEvent?.data.message;
    if (!message || chat.title !== "New chat") return null;

    await ctx.db.patch(chatId, { title: deriveChatTitle(message) });

    return null;
  },
});
