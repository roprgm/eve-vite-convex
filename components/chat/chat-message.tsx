import type { EveMessage } from "eve/client";
import { Check, Copy } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";

import { ModelActivity } from "@/components/chat/model-activity";
import { Button } from "@/components/ui/button";

const MarkdownMessage = lazy(async () => {
  const module = await import("@/components/chat/markdown-message");
  return { default: module.MarkdownMessage };
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

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
  createdAt,
  text,
}: {
  readonly createdAt?: number;
  readonly text: string;
}) {
  return (
    <article aria-label="You" className="group/message flex flex-col items-end py-3">
      <div className="max-w-[85%] rounded-xl bg-muted px-4 py-2 sm:max-w-[75%]">
        <p className="whitespace-pre-wrap">{text}</p>
      </div>
      <MessageActions createdAt={createdAt} text={text} />
    </article>
  );
}

type ChatMessageProps = {
  readonly createdAt?: number;
  readonly isActive: boolean;
  readonly message: EveMessage;
};

export function ChatMessage({ createdAt, isActive, message }: ChatMessageProps) {
  const textParts = message.parts.filter((part) => part.type === "text");
  const text = textParts.map((part) => part.text).join("\n\n");

  if (message.role === "user") {
    if (!text) return null;
    return <UserMessage createdAt={createdAt} text={text} />;
  }

  const reasoningParts = message.parts.filter((part) => part.type === "reasoning");
  const reasoning = reasoningParts.map((part) => part.text).join("\n\n");
  if (!reasoning && !text) return null;

  if (isActive && !text) return null;

  return (
    <article aria-label="Eve" className="group/message pt-3 pb-5">
      {reasoning && <ModelActivity details={reasoning} label="Thinking..." />}
      {text && (
        <>
          <Suspense fallback={null}>
            <MarkdownMessage isAnimating={isActive} text={text} />
          </Suspense>
          {!isActive && <MessageActions createdAt={createdAt} text={text} />}
        </>
      )}
    </article>
  );
}
