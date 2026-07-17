import type { EveMessage } from "eve/client";

export function countUserMessages(messages: readonly EveMessage[]): number {
  return messages.filter((message) => message.role === "user").length;
}

export function hasAssistantTextAfterLatestUser(messages: readonly EveMessage[]): boolean {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role === "user") return false;
    if (message.parts.some((part) => part.type === "text" && part.text.trim().length > 0)) {
      return true;
    }
  }

  return false;
}

export function findLatestAssistantMessageId(
  messages: readonly EveMessage[],
): EveMessage["id"] | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "assistant") return message.id;
  }

  return undefined;
}
