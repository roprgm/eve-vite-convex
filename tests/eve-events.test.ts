import { describe, expect, it } from "vitest";

import { projectEveChat, type StoredEveEvent } from "@/lib/eve-events";

function userEvent(index: number, message: string, at: string): StoredEveEvent {
  return {
    event: {
      data: { message, sequence: index, turnId: `turn_${index}` },
      meta: { at },
      type: "message.received",
    },
    index,
  };
}

const optimistic = {
  createdAt: 20,
  message: "second",
  startIndex: 1,
  submissionId: "submission-1",
};

describe("projectEveChat", () => {
  it("inserts an optimistic message after its checkpoint", () => {
    const messages = projectEveChat(
      [userEvent(0, "first", "2026-01-01T10:00:00.000Z")],
      [],
      optimistic,
    );
    expect(messages.map(({ id }) => id)).toEqual(["turn_0:user", "optimistic:submission-1:user"]);
    expect(messages.at(-1)?.createdAt).toBe(20);
  });

  it("reconciles message.received without duplication", () => {
    const messages = projectEveChat(
      [
        userEvent(0, "first", "2026-01-01T10:00:00.000Z"),
        userEvent(1, "second", "2026-01-01T10:01:00.000Z"),
      ],
      [],
      optimistic,
    );
    expect(messages.map(({ id }) => id)).toEqual(["turn_0:user", "turn_1:user"]);
    expect(messages.at(-1)?.createdAt).toBe(20);
  });

  it("projects a stored answer onto its original question", () => {
    const messages = projectEveChat(
      [
        {
          event: {
            data: {
              requests: [
                {
                  action: {
                    callId: "call-1",
                    input: {},
                    kind: "tool-call",
                    toolName: "ask_question",
                  },
                  options: [
                    { id: "short", label: "A short story" },
                    { id: "long", label: "A long story" },
                  ],
                  prompt: "What kind of story?",
                  requestId: "request-1",
                },
              ],
              sequence: 0,
              stepIndex: 0,
              turnId: "turn-1",
            },
            type: "input.requested",
          },
          index: 0,
        },
      ],
      [{ createdAt: 20, optionId: "short", requestId: "request-1" }],
    );
    const part = messages[0]?.parts.find((item) => item.type === "dynamic-tool");

    expect(part?.state).toBe("approval-responded");
    expect(part?.toolMetadata?.eve?.inputRequest?.prompt).toBe("What kind of story?");
    expect(part?.toolMetadata?.eve?.inputResponse?.optionId).toBe("short");
  });

  it("projects an optimistic answer before it is stored", () => {
    const question = {
      event: {
        data: {
          requests: [
            {
              action: {
                callId: "call-1",
                input: {},
                kind: "tool-call",
                toolName: "ask_question",
              },
              prompt: "What kind of story?",
              requestId: "request-1",
            },
          ],
          sequence: 0,
          stepIndex: 0,
          turnId: "turn-1",
        },
        type: "input.requested",
      },
      index: 0,
    } as const;
    const messages = projectEveChat([question], [], {
      createdAt: 20,
      inputResponses: [{ requestId: "request-1", text: "A mystery" }],
      startIndex: 1,
      submissionId: "submission-1",
    });
    const part = messages[0]?.parts.find((item) => item.type === "dynamic-tool");

    expect(part?.toolMetadata?.eve?.inputResponse?.text).toBe("A mystery");
  });
});
