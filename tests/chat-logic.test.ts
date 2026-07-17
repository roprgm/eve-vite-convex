import { describe, expect, it } from "vitest";

import {
  advanceChatLifecycle,
  deriveChatTitle,
  parseEventType,
  parseMessageEvent,
} from "@/lib/chat-logic";

describe("parseEventType", () => {
  it("reads the event type from the persisted event", () => {
    expect(parseEventType({ type: "turn.completed" })).toBe("turn.completed");
    expect(parseEventType({ type: 42 })).toBeNull();
  });
});

describe("advanceChatLifecycle", () => {
  it("marks active events as running without advancing the revision", () => {
    expect(advanceChatLifecycle("message.appended", 2)).toEqual({
      revision: 2,
      status: "running",
    });
  });

  it("advances the revision when a session becomes resumable", () => {
    expect(advanceChatLifecycle("session.waiting", 2)).toEqual({
      revision: 3,
      status: "ready",
    });
  });

  it("finishes when Eve omits a session boundary", () => {
    expect(advanceChatLifecycle("turn.completed", 2)).toEqual({
      revision: 3,
      status: "ready",
    });
  });

  it("becomes ready when a turn is cancelled", () => {
    expect(advanceChatLifecycle("turn.cancelled", 2)).toEqual({
      revision: 3,
      status: "ready",
    });
  });
});

describe("deriveChatTitle", () => {
  it("normalizes whitespace", () => {
    expect(deriveChatTitle("  Plan\n\n a   weekend trip  ")).toBe("Plan a weekend trip");
  });

  it("truncates long titles at a word boundary", () => {
    expect(deriveChatTitle("Explain how durable event streaming works in this application")).toBe(
      "Explain how durable event streaming…",
    );
  });

  it("falls back for empty messages", () => {
    expect(deriveChatTitle(" \n ")).toBe("New chat");
  });
});

describe("parseMessageEvent", () => {
  it("accepts the shared fields from received and completed messages", () => {
    expect(
      parseMessageEvent({
        data: { message: "Hello", parts: [], sequence: 1, turnId: "turn-1" },
        meta: { at: "2026-07-14T10:00:00.000Z" },
        type: "message.received",
      }),
    ).toEqual({
      data: { message: "Hello", sequence: 1, turnId: "turn-1" },
      meta: { at: "2026-07-14T10:00:00.000Z" },
      type: "message.received",
    });
  });

  it("rejects unrelated stream events", () => {
    expect(parseMessageEvent({ data: {}, type: "turn.completed" })).toBeNull();
  });
});
