export const CHAT_ID_ATTRIBUTE = "chatId";
export const CHAT_ID_HEADER = "x-eve-chat-id";

const CHAT_ID_PATTERN = /^[A-Za-z0-9_-]{16}$/;

export function createPublicChatId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .slice(0, 16);
}

export function isPublicChatId(value: unknown): value is string {
  return typeof value === "string" && CHAT_ID_PATTERN.test(value);
}
