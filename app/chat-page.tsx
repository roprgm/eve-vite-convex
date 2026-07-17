import { useQuery } from "convex/react";
import { useNavigate, useParams } from "react-router";

import { ChatView } from "@/components/chat/chat-view";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import type { StoredEveEvent } from "@/lib/eve-events";
import { toClientContinuationToken } from "@/lib/eve-session";

const NO_EVENTS: readonly StoredEveEvent[] = [];

function getInitialSession(chat: Doc<"chats">) {
  return {
    continuationToken: toClientContinuationToken(chat.continuationToken),
    sessionId: chat.eveSessionId,
    streamIndex: chat.sessionStreamIndex ?? chat.streamIndex,
  };
}

function getSessionRevisionKey(chat: Doc<"chats">): string {
  // useEveAgent reads initialSession only when its store mounts.
  return `${chat._id}:${chat.revision}`;
}

function ChatLoading() {
  return (
    <main
      aria-label="Loading chat"
      className="flex min-w-0 flex-1 flex-col bg-background"
      role="status"
    >
      <header className="flex h-12 shrink-0 items-center justify-between border-b px-3 sm:px-4">
        <div className="flex items-center gap-1">
          <Skeleton className="size-6 md:hidden" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-6 w-20 md:hidden" />
      </header>
      <div className="min-h-0 flex-1" />
      <div className="shrink-0 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6">
        <Skeleton className="mx-auto h-12 w-full max-w-4xl rounded-xl" />
        <Skeleton className="mx-auto mt-2 h-4 w-64 max-w-full" />
      </div>
    </main>
  );
}

function ChatNotFound() {
  const navigate = useNavigate();

  return (
    <main className="flex min-w-0 flex-1 items-center justify-center p-6 text-center">
      <div>
        <h1 className="font-medium">Chat not found</h1>
        <Button className="mt-4" onClick={() => void navigate("/")} variant="outline">
          Start a new chat
        </Button>
      </div>
    </main>
  );
}

export function NewChatPage() {
  return <ChatView events={NO_EVENTS} title="New chat" />;
}

function ChatPageContent({ chatId }: { readonly chatId?: string }) {
  const detail = useQuery(api.chats.get, chatId ? { id: chatId } : "skip");

  if (!chatId || detail === null) return <ChatNotFound />;
  if (detail === undefined) return <ChatLoading />;

  const { chat } = detail;

  return (
    <ChatView
      chatId={chatId}
      events={detail.events}
      historyTruncated={detail.historyTruncated}
      initialSession={getInitialSession(chat)}
      key={getSessionRevisionKey(chat)}
      sharedStatus={chat.status}
      shouldResume={chat.resumeAfterStop}
      title={chat.title}
    />
  );
}

export function ChatPage() {
  const { chatId } = useParams();
  return <ChatPageContent chatId={chatId} />;
}
