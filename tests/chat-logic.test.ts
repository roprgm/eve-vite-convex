import { describe, expect, it } from "vitest";

import { advanceChatLifecycle, deriveChatTitle } from "@/lib/chat-logic";

describe("advanceChatLifecycle", () => {
  it.each([
    ["message.appended", { revision: 2, status: "running" }],
    ["session.waiting", { revision: 3, status: "ready" }],
    ["turn.completed", { revision: 3, status: "ready" }],
    ["turn.cancelled", { revision: 3, status: "ready" }],
  ])("projects %s", (eventType, expected) => {
    expect(advanceChatLifecycle(eventType, 2)).toEqual(expected);
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
