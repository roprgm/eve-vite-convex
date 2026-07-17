import type { EveMessage } from "eve/client";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { MarkdownMessage } from "@/components/chat/markdown-message";
import { ModelActivity } from "@/components/chat/model-activity";
import { Button } from "@/components/ui/button";
import { MessageScrollerAnimatedItem, MessageScrollerItem } from "@/components/ui/message-scroller";

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

function getReasoningLabel(isActive: boolean, seconds?: number): string {
  if (isActive) return "Thinking...";
  if (seconds === undefined) return "Thought";

  const unit = seconds === 1 ? "second" : "seconds";
  return `Thought for ${seconds} ${unit}`;
}

function MessageActions({
  createdAt,
  text,
}: {
  readonly createdAt?: number;
  readonly text: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2_000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copyMessage(): Promise<void> {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <div className="mt-1 flex h-6 items-center gap-1 text-muted-foreground opacity-0 transition-opacity group-hover/message:opacity-100 group-focus-within/message:opacity-100">
      {createdAt !== undefined && (
        <time className="text-sm" dateTime={new Date(createdAt).toISOString()}>
          {timeFormatter.format(createdAt)}
        </time>
      )}
      <Button
        aria-label={copied ? "Copied" : "Copy message"}
        className="text-muted-foreground"
        onClick={() => void copyMessage()}
        size="icon-sm"
        title={copied ? "Copied" : "Copy"}
        variant="ghost"
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </Button>
    </div>
  );
}

export function UserMessage({
  animated = false,
  createdAt,
  id,
  text,
}: {
  readonly animated?: boolean;
  readonly createdAt?: number;
  readonly id: string;
  readonly text: string;
}) {
  const Item = animated ? MessageScrollerAnimatedItem : MessageScrollerItem;

  return (
    <Item messageId={id}>
      <article aria-label="You" className="group/message flex flex-col items-end py-3">
        <div className="max-w-[85%] rounded-xl bg-muted px-4 py-2 sm:max-w-[75%]">
          <p className="whitespace-pre-wrap">{text}</p>
        </div>
        <MessageActions createdAt={createdAt} text={text} />
      </article>
    </Item>
  );
}

type ChatMessageProps = {
  readonly createdAt?: number;
  readonly isActive: boolean;
  readonly message: EveMessage;
  readonly reasoningSeconds?: number;
};

export function ChatMessage({ createdAt, isActive, message, reasoningSeconds }: ChatMessageProps) {
  const textParts = message.parts.filter((part) => part.type === "text");
  const text = textParts.map((part) => part.text).join("\n\n");

  if (message.role === "user") {
    if (!text) return null;
    return <UserMessage createdAt={createdAt} id={message.id} text={text} />;
  }

  const reasoningParts = message.parts.filter((part) => part.type === "reasoning");
  const reasoning = reasoningParts.map((part) => part.text).join("\n\n");
  const reasoningLabel = getReasoningLabel(isActive, reasoningSeconds);
  if (!reasoning && !text) return null;

  if (isActive && !text) return null;

  return (
    <MessageScrollerItem messageId={message.id}>
      <article aria-label="Eve" className="group/message pt-3 pb-5">
        {reasoning && (
          <ModelActivity details={reasoning} isAnimated={isActive} label={reasoningLabel} />
        )}
        {text && (
          <>
            <MarkdownMessage isAnimating={isActive} text={text} />
            {!isActive && <MessageActions createdAt={createdAt} text={text} />}
          </>
        )}
      </article>
    </MessageScrollerItem>
  );
}
