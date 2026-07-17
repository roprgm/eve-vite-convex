import { useMutation } from "convex/react";
import type { HandleMessageStreamEvent, SessionState } from "eve/client";
import { ArrowDown, PanelLeft, Pencil, SquarePen } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatConversation } from "@/components/chat/chat-conversation";
import { InputRequest } from "@/components/chat/input-request";
import { useChatScroll } from "@/components/chat/use-chat-scroll";
import { useChatSession } from "@/components/chat/use-chat-session";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { ChatStatus } from "@/lib/chat-logic";
import { NEW_CHAT_DRAFT, useChatStore } from "@/lib/chat-store";
import type { StoredEveEvent } from "@/lib/eve-events";

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
  const [draftTitle, setDraftTitle] = useState(title);
  const [error, setError] = useState<string>();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) return;
    titleInputRef.current?.focus();
  }, [isEditing]);

  function startEditing(): void {
    setDraftTitle(title);
    setError(undefined);
    setIsEditing(true);
  }

  function cancelEditing(): void {
    setDraftTitle(title);
    setError(undefined);
    setIsEditing(false);
  }

  async function saveTitle(): Promise<void> {
    if (!chatId) return;

    const nextTitle = draftTitle.trim();
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
                maxLength={100}
                onBlur={() => void saveTitle()}
                onChange={(event) => setDraftTitle(event.target.value)}
                onKeyDown={handleTitleKeyDown}
                ref={titleInputRef}
                title={error}
                value={draftTitle}
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

type ChatSession = ReturnType<typeof useChatSession>;
type ChatScroll = ReturnType<typeof useChatScroll>;

function ChatNotices({
  historyTruncated,
  session,
}: {
  readonly historyTruncated?: boolean;
  readonly session: ChatSession;
}) {
  return (
    <>
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
    </>
  );
}

function ChatTimeline({
  historyTruncated,
  scroll,
  session,
}: {
  readonly historyTruncated?: boolean;
  readonly scroll: ChatScroll;
  readonly session: ChatSession;
}) {
  return (
    <div className="relative min-h-0 flex-1">
      <section
        aria-label="Messages"
        className="app-scrollbar scroll-fade absolute inset-0 overflow-y-auto scrollbar-gutter-stable"
        onScroll={scroll.handleScroll}
        ref={scroll.viewportRef}
      >
        <div className="min-h-full px-3 sm:px-6">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
            <ChatConversation session={session} />
            <ChatNotices historyTruncated={historyTruncated} session={session} />
          </div>
        </div>
      </section>
      {!scroll.isAtBottom && (
        <Button
          aria-label="Jump to latest"
          className="absolute bottom-3 left-1/2 size-8 -translate-x-1/2 rounded-full bg-background shadow-md"
          onClick={scroll.scrollToEnd}
          size="icon-sm"
          variant="outline"
        >
          <ArrowDown aria-hidden="true" />
        </Button>
      )}
    </div>
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
  const openSidebar = useChatStore((state) => state.openSidebar);
  const setDraft = useChatStore((state) => state.setDraft);
  const navigate = useNavigate();
  const session = useChatSession({
    chatId,
    events,
    initialEvents,
    initialSession,
    sharedStatus,
  });
  const scroll = useChatScroll();

  async function handleSend(message: string): Promise<boolean> {
    scroll.scrollToEnd();
    return session.sendMessage(message);
  }

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
      <ChatTimeline historyTruncated={historyTruncated} scroll={scroll} session={session} />
      <ChatComposer
        disabled={session.sessionLimitReached}
        draftKey={chatId ?? NEW_CHAT_DRAFT}
        isGenerating={session.isGenerating}
        needsOption={session.needsOption}
        onSend={handleSend}
        onStop={session.stop}
      />
    </main>
  );
}
