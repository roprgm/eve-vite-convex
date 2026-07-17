const MAX_TITLE_LENGTH = 42;

export type ChatStatus = "error" | "ready" | "running";

export type ChatLifecycle = {
  readonly revision: number;
  readonly status: ChatStatus;
};

export type PersistedMessageEvent = {
  data: {
    message: string | null;
    sequence: number;
    turnId: string;
  };
  meta?: { at: string };
  type: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function deriveChatTitle(message: string): string {
  const normalized = message.replace(/\s+/g, " ").trim();

  if (!normalized) return "New chat";
  if (normalized.length <= MAX_TITLE_LENGTH) return normalized;

  const candidate = normalized.slice(0, MAX_TITLE_LENGTH - 1);
  const lastSpace = candidate.lastIndexOf(" ");
  const end = lastSpace >= 24 ? lastSpace : candidate.length;

  return `${candidate.slice(0, end)}…`;
}

export function advanceChatLifecycle(eventType: string, revision: number): ChatLifecycle {
  if (eventType === "session.failed") {
    return { revision: revision + 1, status: "error" };
  }

  if (
    eventType === "session.completed" ||
    eventType === "session.waiting" ||
    eventType === "turn.completed"
  ) {
    return { revision: revision + 1, status: "ready" };
  }

  return { revision, status: "running" };
}

export function parseMessageEvent(value: unknown): PersistedMessageEvent | null {
  if (!isRecord(value) || !isRecord(value.data) || typeof value.type !== "string") {
    return null;
  }

  const { data } = value;
  if (
    (typeof data.message !== "string" && data.message !== null) ||
    typeof data.sequence !== "number" ||
    typeof data.turnId !== "string"
  ) {
    return null;
  }

  const meta =
    isRecord(value.meta) && typeof value.meta.at === "string" ? { at: value.meta.at } : undefined;

  return {
    data: {
      message: data.message,
      sequence: data.sequence,
      turnId: data.turnId,
    },
    ...(meta ? { meta } : {}),
    type: value.type,
  };
}
