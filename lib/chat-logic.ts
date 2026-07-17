const MAX_TITLE_LENGTH = 42;

export type ChatStatus = "error" | "ready" | "running";

export function deriveChatTitle(message: string): string {
  const normalized = message.replace(/\s+/g, " ").trim();

  if (!normalized) return "New chat";
  if (normalized.length <= MAX_TITLE_LENGTH) return normalized;

  const candidate = normalized.slice(0, MAX_TITLE_LENGTH - 1);
  const lastSpace = candidate.lastIndexOf(" ");
  const end = lastSpace >= 24 ? lastSpace : candidate.length;

  return `${candidate.slice(0, end)}…`;
}

export function advanceChatLifecycle(eventType: string, revision: number) {
  if (eventType === "session.failed") {
    return { revision: revision + 1, status: "error" } as const;
  }

  if (
    eventType === "session.completed" ||
    eventType === "session.waiting" ||
    eventType === "turn.cancelled" ||
    eventType === "turn.completed"
  ) {
    return { revision: revision + 1, status: "ready" } as const;
  }

  return { revision, status: "running" } as const;
}
