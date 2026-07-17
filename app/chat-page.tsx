import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import type { HandleMessageStreamEvent, SessionState } from "eve/client";
import { useLocation, useNavigate, useParams } from "react-router";

import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatView } from "@/components/chat/chat-view";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import type { StoredEveEvent } from "@/lib/eve-events";
import { toClientContinuationToken } from "@/lib/eve-session";

const NO_EVENTS: readonly StoredEveEvent[] = [];
const CHAT_CACHE_TIME_MS = 10 * 60 * 1_000;

function getInitialSession(chat: Doc<"chats">) {
  return {
    continuationToken: toClientContinuationToken(chat.continuationToken),
    sessionId: chat.eveSessionId,
    streamIndex: chat.streamIndex,
  };
}

type ChatHandoff = {
  readonly chatId: string;
  readonly events: readonly HandleMessageStreamEvent[];
  readonly session: SessionState;
};

async function rejectSendWhileLoading(): Promise<boolean> {
  return false;
}

function ChatLoading({ chatId }: { readonly chatId: string }) {
  return (
    <main aria-busy="true" className="flex min-w-0 flex-1 flex-col bg-background">
      <div className="h-12 shrink-0 border-b" />
      <div aria-label="Loading chat" className="min-h-0 flex-1" role="status" />
      <ChatComposer
        disabled
        draftKey={chatId}
        isGenerating={false}
        needsOption={false}
        onSend={rejectSendWhileLoading}
        onStop={() => undefined}
      />
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
  const location = useLocation();
  const { data: detail } = useQuery({
    ...convexQuery(api.chats.get, chatId ? { id: chatId } : "skip"),
    gcTime: CHAT_CACHE_TIME_MS,
  });
  const handoff = (location.state as { readonly chatHandoff?: ChatHandoff } | null)?.chatHandoff;
  const matchingHandoff = handoff?.chatId === chatId ? handoff : undefined;

  if (!chatId || detail === null) return <ChatNotFound />;
  if (detail === undefined && !matchingHandoff) return <ChatLoading chatId={chatId} />;

  if (!detail) {
    return (
      <ChatView
        chatId={chatId}
        events={NO_EVENTS}
        initialEvents={matchingHandoff?.events}
        initialSession={matchingHandoff?.session}
        key={chatId}
        title="New chat"
      />
    );
  }

  const { chat } = detail;

  return (
    <ChatView
      chatId={chatId}
      events={detail.events}
      historyTruncated={detail.historyTruncated}
      initialSession={getInitialSession(chat)}
      key={chatId}
      sharedStatus={chat.status}
      title={chat.title}
    />
  );
}

export function ChatPage() {
  const { chatId } = useParams();
  return <ChatPageContent chatId={chatId} />;
}
