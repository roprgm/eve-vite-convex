import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";

const MAX_TITLE_LENGTH = 42;

async function generateChatTitle(message: string): Promise<string> {
  const normalized = message.replace(/\s+/g, " ").trim();

  if (!normalized) return "New chat";
  if (normalized.length <= MAX_TITLE_LENGTH) return normalized;

  const candidate = normalized.slice(0, MAX_TITLE_LENGTH - 1);
  const lastSpace = candidate.lastIndexOf(" ");
  if (lastSpace >= 24) return `${candidate.slice(0, lastSpace)}…`;
  return `${candidate}…`;
}

export const generate = internalAction({
  args: { id: v.id("chats"), message: v.string() },
  handler: async (ctx, args) => {
    const title = await generateChatTitle(args.message);
    await ctx.runMutation(internal.title.save, { id: args.id, title });
  },
});

export const save = internalMutation({
  args: { id: v.id("chats"), title: v.string() },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.id);
    if (chat?.title !== "New chat") return;
    await ctx.db.patch(chat._id, { title: args.title });
  },
});
