import type { EveMessage } from "eve/client";
import { Streamdown } from "streamdown";

import { ModelActivity } from "@/components/chat/model-activity";

import "streamdown/styles.css";

export function UserMessage({ text }: { readonly text: string }) {
  return (
    <article aria-label="You" className="flex justify-end py-3">
      <div className="max-w-[85%] rounded-xl bg-muted px-4 py-2.5 sm:max-w-[75%]">
        <p className="whitespace-pre-wrap">{text}</p>
      </div>
    </article>
  );
}

type ChatMessageProps = {
  readonly isActive: boolean;
  readonly message: EveMessage;
};

export function ChatMessage({ isActive, message }: ChatMessageProps) {
  const textParts = message.parts.filter((part) => part.type === "text");
  const text = textParts.map((part) => part.text).join("\n\n");

  if (message.role === "user") {
    if (!text) return null;
    return <UserMessage text={text} />;
  }

  const reasoningParts = message.parts.filter((part) => part.type === "reasoning");
  const reasoning = reasoningParts.map((part) => part.text).join("\n\n");
  if (!reasoning && !text) return null;

  if (isActive && !text) return null;

  return (
    <article aria-label="Eve" className="pt-3 pb-8">
      {reasoning && <ModelActivity details={reasoning} label="Thinking..." />}
      {text && (
        <Streamdown
          animated
          className="model-response leading-6 [&_li]:py-0"
          controls={{ table: false }}
          isAnimating={isActive}
        >
          {text}
        </Streamdown>
      )}
    </article>
  );
}
