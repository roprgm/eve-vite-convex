import type { EveMessage } from "eve/client";
import { expect, it } from "vitest";

import { getActivityLabel } from "@/components/chat/use-chat-session";

const userMessage: EveMessage = {
  id: "turn-1:user",
  parts: [{ text: "Ask me something", type: "text" }],
  role: "user",
};

it("shows fallback activity before assistant output arrives", () => {
  expect(getActivityLabel(true, [userMessage], false, undefined)).toBe("Thinking...");
});

it("hides fallback activity when assistant reasoning arrives", () => {
  const assistantMessage: EveMessage = {
    id: "turn-1:assistant",
    parts: [{ state: "streaming", text: "Choosing a question", type: "reasoning" }],
    role: "assistant",
  };

  expect(getActivityLabel(true, [userMessage, assistantMessage], false, undefined)).toBeUndefined();
});
