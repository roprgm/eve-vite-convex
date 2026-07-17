import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import type { HandleMessageStreamEvent, SessionState } from "eve/client";
import { useLocation, useParams } from "react-router";

import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatView } from "@/components/chat/chat-view";
import { api } from "@/convex/_generated/api";
import type { StoredEveEvent } from "@/lib/eve-events";
import { toClientContinuationToken } from "@/lib/eve-session";
import { NotFoundPage } from "./not-found";

const NO_EVENTS: readonly StoredEveEvent[] = [];

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

export function ChatPage() {
  const { chatId } = useParams();
  const location = useLocation();
  const { data: detail } = useQuery(convexQuery(api.chats.get, chatId ? { id: chatId } : "skip"));
  const handoff = (location.state as { readonly chatHandoff?: ChatHandoff } | null)?.chatHandoff;
  const matchingHandoff = handoff?.chatId === chatId ? handoff : undefined;

  if (!chatId) return <ChatView events={NO_EVENTS} title="New chat" />;
  if (detail === null) return <NotFoundPage title="Chat not found" />;
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
      initialSession={{
        continuationToken: toClientContinuationToken(chat.continuationToken),
        sessionId: chat.eveSessionId,
        streamIndex: chat.streamIndex,
      }}
      key={chatId}
      sharedStatus={chat.status}
      title={chat.title}
    />
  );
}
