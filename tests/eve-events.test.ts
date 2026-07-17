import { describe, expect, it } from "vitest";

import { projectEveMessages, type StoredEveEvent } from "@/lib/eve-events";

function userEvent(sessionId: string, message: string): StoredEveEvent {
  return {
    eveSessionId: sessionId,
    event: {
      data: { message, sequence: 0, turnId: "turn_0" },
      type: "message.received",
    },
    eventKey: `${sessionId}:message.received`,
  };
}

describe("projectEveMessages", () => {
  it("renders one user message per persisted event", () => {
    expect(projectEveMessages([userEvent("run-1", "hi")])).toHaveLength(1);
  });

  it("keeps identical turn IDs from separate eve runs distinct", () => {
    const messages = projectEveMessages([
      userEvent("run-1", "first"),
      userEvent("run-2", "second"),
    ]);

    expect(messages.map((message) => message.id)).toEqual([
      "run-1:turn_0:user",
      "run-2:turn_0:user",
    ]);
  });
});
