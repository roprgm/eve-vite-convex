import { useMutation } from "convex/react";
import type { HandleMessageStreamEvent, SessionState } from "eve/client";
import { PanelLeft, Pencil, SquarePen } from "lucide-react";
import { type KeyboardEvent, lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router";

import { ChatComposer } from "@/components/chat/chat-composer";
import { InputRequest } from "@/components/chat/input-request";
import { useChatSession } from "@/components/chat/use-chat-session";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MessageScroller, MessageScrollerItem } from "@/components/ui/message-scroller";
import { api } from "@/convex/_generated/api";
import type { ChatStatus } from "@/lib/chat-logic";
import { NEW_CHAT_DRAFT, useChatStore } from "@/lib/chat-store";
import type { StoredEveEvent } from "@/lib/eve-events";

const ChatConversation = lazy(async () => {
  const module = await import("@/components/chat/chat-conversation");
  return { default: module.ChatConversation };
});

type ChatViewProps = {
  readonly chatId?: string;
  readonly events: readonly StoredEveEvent[];
  readonly historyTruncated?: boolean;
  readonly initialEvents?: readonly HandleMessageStreamEvent[];
  readonly initialSession?: SessionState;
  readonly sharedStatus?: ChatStatus;
  readonly title: string;
};

function ChatHeader({
  chatId,
  onNewChat,
  onOpenSidebar,
  title,
}: {
  readonly chatId?: string;
  readonly onNewChat: () => void;
  readonly onOpenSidebar: () => void;
  readonly title: string;
}) {
  const renameChat = useMutation(api.chats.rename);
  const [error, setError] = useState<string>();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) titleInputRef.current?.focus();
  }, [isEditing]);

  function startEditing(): void {
    setError(undefined);
    setIsEditing(true);
  }

  function cancelEditing(): void {
    setError(undefined);
    setIsEditing(false);
  }

  async function saveTitle(): Promise<void> {
    if (!chatId) return;

    const nextTitle = titleInputRef.current?.value.trim();
    if (!nextTitle) {
      cancelEditing();
      return;
    }
    if (nextTitle === title) {
      setIsEditing(false);
      return;
    }

    setError(undefined);
    setIsSaving(true);
    try {
      await renameChat({ id: chatId, title: nextTitle });
      setIsEditing(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not rename chat.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleTitleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== "Escape") return;
    event.preventDefault();
    cancelEditing();
  }

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b px-3 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <Button
          aria-label="Open chats"
          className="md:hidden"
          onClick={onOpenSidebar}
          size="icon-sm"
          variant="ghost"
        >
          <PanelLeft aria-hidden="true" />
        </Button>
        <div className="group/title flex min-w-0 items-center gap-1">
          {isEditing ? (
            <form
              className="min-w-0"
              onSubmit={(event) => {
                event.preventDefault();
                void saveTitle();
              }}
            >
              <input
                aria-invalid={Boolean(error)}
                aria-label={`Rename ${title}`}
                className="min-w-8 max-w-[50vw] bg-transparent p-0 font-medium outline-none [field-sizing:content] aria-invalid:text-destructive"
                disabled={isSaving}
                defaultValue={title}
                maxLength={100}
                onBlur={() => void saveTitle()}
                onKeyDown={handleTitleKeyDown}
                ref={titleInputRef}
                title={error}
              />
            </form>
          ) : (
            <h1 className="truncate font-medium">{title}</h1>
          )}
          {chatId && !isSaving && (
            <Button
              aria-label={`Rename ${title}`}
              className="opacity-0 text-muted-foreground transition-opacity group-hover/title:opacity-100 focus-visible:opacity-100 disabled:!opacity-100"
              disabled={isEditing}
              onClick={startEditing}
              size="icon-sm"
              variant="ghost"
            >
              <Pencil aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
      <Button className="md:hidden" onClick={onNewChat} size="sm" variant="ghost">
        <SquarePen aria-hidden="true" />
        New chat
      </Button>
    </header>
  );
}

export function ChatView({
  chatId,
  events,
  historyTruncated,
  initialEvents,
  initialSession,
  sharedStatus,
  title,
}: ChatViewProps) {
  const { openSidebar } = useOutletContext<{ readonly openSidebar: () => void }>();
  const setDraft = useChatStore((state) => state.setDraft);
  const navigate = useNavigate();
  const session = useChatSession({
    chatId,
    events,
    initialEvents,
    initialSession,
    sharedStatus,
  });
  const hasNotices = session.pendingInput || historyTruncated || session.error;

  function openNewChat(): void {
    setDraft(NEW_CHAT_DRAFT, "");
    void navigate("/");
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-background">
      <ChatHeader
        chatId={chatId}
        onNewChat={openNewChat}
        onOpenSidebar={openSidebar}
        title={title}
      />
      <MessageScroller>
        <Suspense fallback={null}>
          <ChatConversation session={session} />
          {hasNotices && (
            <MessageScrollerItem>
              {session.pendingInput && (
                <InputRequest
                  disabled={session.isGenerating}
                  onSelect={session.answerQuestion}
                  request={session.pendingInput}
                />
              )}
              {historyTruncated && (
                <Alert className="my-4 p-4">
                  Showing the latest 1,000 persisted events. Earlier history is hidden in this demo.
                </Alert>
              )}
              {session.error && (
                <Alert className="my-4 px-4 py-2" variant="destructive">
                  {session.error.message}
                </Alert>
              )}
            </MessageScrollerItem>
          )}
        </Suspense>
      </MessageScroller>
      <ChatComposer
        disabled={session.sessionLimitReached}
        draftKey={chatId ?? NEW_CHAT_DRAFT}
        isGenerating={session.isGenerating}
        needsOption={session.needsOption}
        onSend={session.sendMessage}
        onStop={session.stop}
      />
    </main>
  );
}
