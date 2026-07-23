import type { EveMessage, EveMessageInputRequest, InputResponse } from "eve/client";

import { InputRequest } from "@/components/chat/input-request";
import { MarkdownMessage } from "@/components/chat/markdown-message";
import { ModelActivity } from "@/components/chat/model-activity";
import { CopyButton } from "@/components/ui/copy-button";
import { MessageScrollerItem } from "@/components/ui/message-scroller";

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

function getReasoningLabel(isActive: boolean): string {
  if (isActive) return "Thinking...";
  return "Thought";
}

type ChatMessageProps = {
  readonly createdAt?: number;
  readonly inputDisabled: boolean;
  readonly isActive: boolean;
  readonly message: EveMessage;
  readonly onSelectInput: (optionId: string) => void;
  readonly pendingInputId?: string;
};

type MessageInputRequest = {
  readonly request: EveMessageInputRequest;
  readonly response?: InputResponse;
};

function messageInputRequests(message: EveMessage): readonly MessageInputRequest[] {
  return message.parts.flatMap((part) => {
    if (part.type !== "dynamic-tool") return [];
    const request = part.toolMetadata?.eve?.inputRequest;
    const response = part.toolMetadata?.eve?.inputResponse;
    if (!request) return [];
    return [{ request, response }];
  });
}

function MessageActions({
  createdAt,
  text,
}: {
  readonly createdAt?: number;
  readonly text: string;
}) {
  return (
    <div className="mt-1 flex h-6 items-center gap-1 text-muted-foreground sm:opacity-0 sm:transition-opacity sm:group-hover/message:opacity-100 sm:group-focus-within/message:opacity-100">
      {createdAt !== undefined && (
        <time className="text-sm" dateTime={new Date(createdAt).toISOString()}>
          {timeFormatter.format(createdAt)}
        </time>
      )}
      <CopyButton value={text} />
    </div>
  );
}

export function ChatMessage({
  createdAt,
  inputDisabled,
  isActive,
  message,
  onSelectInput,
  pendingInputId,
}: ChatMessageProps) {
  const textParts = message.parts.filter((part) => part.type === "text");
  const text = textParts.map((part) => part.text).join("\n\n");

  if (message.role === "user") {
    if (!text) return null;
    return (
      <MessageScrollerItem messageId={message.id}>
        <article aria-label="You" className="group/message flex flex-col items-end py-3">
          <p className="max-w-[85%] whitespace-pre-wrap rounded-xl bg-muted px-4 py-2 sm:max-w-[75%]">
            {text}
          </p>
          <MessageActions createdAt={createdAt} text={text} />
        </article>
      </MessageScrollerItem>
    );
  }

  const reasoningParts = message.parts.filter((part) => part.type === "reasoning");
  const reasoning = reasoningParts.map((part) => part.text).join("\n\n");
  const inputRequests = messageInputRequests(message).filter(
    ({ request, response }) => response || request.requestId === pendingInputId,
  );
  const reasoningLabel = getReasoningLabel(isActive);
  if (!reasoning && !text && inputRequests.length === 0) return null;

  return (
    <MessageScrollerItem messageId={message.id}>
      <article aria-label="Eve" className="group/message pt-3 pb-5">
        {reasoning && (
          <ModelActivity details={reasoning} isAnimated={isActive} label={reasoningLabel} />
        )}
        {text && <MarkdownMessage isAnimating={isActive} text={text} />}
        {inputRequests.map(({ request, response }) =>
          response ? (
            <InputRequest key={request.requestId} request={request} response={response} />
          ) : (
            <InputRequest
              disabled={inputDisabled}
              key={request.requestId}
              onSelect={onSelectInput}
              request={request}
            />
          ),
        )}
        {text && !isActive && <MessageActions createdAt={createdAt} text={text} />}
      </article>
    </MessageScrollerItem>
  );
}
