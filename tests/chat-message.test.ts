import type { EveMessage, InputResponse } from "eve/client";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChatMessage } from "@/components/chat/chat-message";
import { MessageScroller } from "@/components/ui/message-scroller";

function questionMessage(response?: InputResponse): EveMessage {
  const toolMetadata = {
    eve: {
      inputRequest: {
        options: [
          { id: "monday", label: "Monday" },
          { id: "friday", label: "Friday" },
        ],
        prompt: "What's your favorite day?",
        requestId: "request-1",
      },
      inputResponse: response,
      kind: "tool-call" as const,
      name: "ask_question",
    },
  };
  const toolPart = response
    ? ({
        approval: { approved: true, id: "approval-1" },
        input: {},
        state: "approval-responded",
        toolCallId: "call-1",
        toolMetadata,
        toolName: "ask_question",
        type: "dynamic-tool",
      } as const)
    : ({
        approval: { id: "approval-1" },
        input: {},
        state: "approval-requested",
        toolCallId: "call-1",
        toolMetadata,
        toolName: "ask_question",
        type: "dynamic-tool",
      } as const);

  return {
    id: "turn-1:assistant",
    parts: [
      {
        state: "done",
        text: "Choosing a question",
        type: "reasoning",
      },
      toolPart,
    ],
    role: "assistant",
  };
}

function renderMessage(message: EveMessage, pendingInputId?: string, isActive = false): string {
  return renderToStaticMarkup(
    createElement(
      MessageScroller,
      undefined,
      createElement(ChatMessage, {
        inputDisabled: false,
        isActive,
        message,
        onSelectInput: () => undefined,
        pendingInputId,
      }),
    ),
  );
}

it("renders active reasoning as the turn's only activity", () => {
  const message: EveMessage = {
    id: "turn-1:assistant",
    parts: [{ state: "streaming", text: "Choosing a question", type: "reasoning" }],
    role: "assistant",
  };
  const markup = renderMessage(message, undefined, true);
  const articleStart = markup.indexOf('aria-label="Eve"');
  const article = markup.slice(articleStart, markup.indexOf("</article>", articleStart));

  expect(article.match(/Thinking\.\.\./g)).toHaveLength(1);
});

describe("ChatMessage input requests", () => {
  it("keeps a pending question inside its assistant turn", () => {
    const markup = renderMessage(questionMessage(), "request-1");
    const articleStart = markup.indexOf('aria-label="Eve"');
    const articleEnd = markup.indexOf("</article>", articleStart);
    const article = markup.slice(articleStart, articleEnd);
    const question = markup.indexOf("What&#x27;s your favorite day?");

    expect(articleStart).toBeGreaterThan(-1);
    expect(question).toBeGreaterThan(articleStart);
    expect(question).toBeLessThan(articleEnd);
    expect(article).toContain("<button");
  });

  it("keeps the question and marks the stored answer", () => {
    const markup = renderMessage(questionMessage({ optionId: "friday", requestId: "request-1" }));
    const articleStart = markup.indexOf('aria-label="Eve"');
    const article = markup.slice(articleStart, markup.indexOf("</article>", articleStart));

    expect(article).toContain("What&#x27;s your favorite day?");
    expect(article).toContain("Selected answer");
    expect(article).not.toContain("<button");
  });
});
