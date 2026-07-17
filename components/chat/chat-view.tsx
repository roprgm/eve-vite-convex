import type { SessionState } from "eve/client";
import { ChevronDown, PanelLeft, SquarePen } from "lucide-react";
import { useNavigate } from "react-router";

import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatMessage, UserMessage } from "@/components/chat/chat-message";
import { InputRequest } from "@/components/chat/input-request";
import { ModelActivity } from "@/components/chat/model-activity";
import { useChatScroll } from "@/components/chat/use-chat-scroll";
import { useChatSession } from "@/components/chat/use-chat-session";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ChatStatus } from "@/lib/chat-logic";
import { NEW_CHAT_DRAFT, useChatStore } from "@/lib/chat-store";
import type { StoredEveEvent } from "@/lib/eve-events";

type ChatViewProps = {
  readonly chatId?: string;
  readonly events: readonly StoredEveEvent[];
  readonly historyTruncated?: boolean;
  readonly initialSession?: SessionState;
  readonly sharedStatus?: ChatStatus;
  readonly title: string;
};

export function ChatView({
  chatId,
  events,
  historyTruncated,
  initialSession,
  sharedStatus,
  title,
}: ChatViewProps) {
  const openSidebar = useChatStore((state) => state.openSidebar);
  const setDraft = useChatStore((state) => state.setDraft);
  const navigate = useNavigate();
  const {
    answerQuestion,
    activityLabel,
    error,
    isBusy,
    isEmpty,
    isStreaming,
    latestAssistantMessageId,
    messages,
    needsOption,
    pendingInput,
    sendMessage,
    stop,
    visibleOptimisticText,
  } = useChatSession({
    chatId,
    events,
    initialSession,
    sharedStatus,
  });
  const { endRef, handleScroll, isAtBottom, scrollToEnd } = useChatScroll();

  async function handleSend(message: string): Promise<boolean> {
    scrollToEnd();
    return sendMessage(message);
  }

  function openNewChat(): void {
    setDraft(NEW_CHAT_DRAFT, "");
    void navigate("/");
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between border-b px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-1">
          <Button
            aria-label="Open chats"
            className="md:hidden"
            onClick={openSidebar}
            size="icon-sm"
            variant="ghost"
          >
            <PanelLeft aria-hidden="true" />
          </Button>
          <h1 className="truncate font-medium">{title}</h1>
        </div>
        <Button className="md:hidden" onClick={openNewChat} size="sm" variant="ghost">
          <SquarePen aria-hidden="true" />
          New chat
        </Button>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          className="absolute inset-0 overflow-y-auto scrollbar-gutter-stable"
          onScroll={handleScroll}
        >
          <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-5 sm:px-10">
            {isEmpty && !activityLabel ? (
              <div className="flex flex-1 items-center justify-center pb-16 text-center">
                <h2 className="text-2xl font-medium tracking-tight">What can I help with?</h2>
              </div>
            ) : (
              <div aria-live="polite" className="py-5" role="log">
                {messages.map((message) => {
                  const isActive =
                    isBusy &&
                    message.role === "assistant" &&
                    message.id === latestAssistantMessageId;
                  return <ChatMessage isActive={isActive} key={message.id} message={message} />;
                })}
                {visibleOptimisticText && <UserMessage text={visibleOptimisticText} />}
                {activityLabel && <ModelActivity label={activityLabel} />}
              </div>
            )}
            {pendingInput && (
              <InputRequest disabled={isBusy} onSelect={answerQuestion} request={pendingInput} />
            )}
            {historyTruncated && (
              <Alert className="my-4 p-4">
                Showing the latest 1,000 persisted events. Earlier history is hidden in this demo.
              </Alert>
            )}
            {error && (
              <Alert className="my-4 p-4" variant="destructive">
                {error.message}
              </Alert>
            )}
            <div ref={endRef} />
          </div>
        </div>
        {!isAtBottom && (
          <Button
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full shadow-lg"
            onClick={scrollToEnd}
            size="sm"
            variant="outline"
          >
            <ChevronDown aria-hidden="true" />
            Jump to latest
          </Button>
        )}
      </div>

      <ChatComposer
        draftKey={chatId ?? NEW_CHAT_DRAFT}
        isBusy={isBusy}
        isStreaming={isStreaming}
        needsOption={needsOption}
        onSend={handleSend}
        onStop={stop}
      />
    </main>
  );
}
