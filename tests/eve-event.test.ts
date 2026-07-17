import type { HandleMessageStreamEvent, MessageCompletedStreamEvent } from "eve/client";
import { describe, expect, it } from "vitest";
import { getEventKey, getSessionEventKey, toSerializableEvent } from "@/agent/hooks/persist-chat";

const event: MessageCompletedStreamEvent & {
  readonly meta: { readonly at: string };
} = {
  data: {
    finishReason: "stop",
    message: "Hello",
    sequence: 2,
    stepIndex: 1,
    turnId: "turn-1",
  },
  meta: { at: "2026-07-14T10:00:00.000Z" },
  type: "message.completed",
};

describe("getEventKey", () => {
  it("uses stable eve event coordinates", () => {
    expect(getEventKey(event)).toBe("message.completed:turn-1:2:1:2026-07-14T10:00:00.000Z");
  });

  it("distinguishes steps within a turn", () => {
    const nextStep = {
      ...event,
      data: { ...event.data, stepIndex: 2 },
    } as HandleMessageStreamEvent;

    expect(getEventKey(nextStep)).not.toBe(getEventKey(event));
  });

  it("namespaces coordinates by eve run", () => {
    expect(getSessionEventKey("run-2", event)).toBe(`run-2:${getEventKey(event)}`);
  });
});

describe("toSerializableEvent", () => {
  it("removes undefined values before sending to Convex", () => {
    const value = toSerializableEvent({ ...event, optional: undefined } as never);
    expect(value).not.toHaveProperty("optional");
  });
});
