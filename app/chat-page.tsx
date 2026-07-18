import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";

import { ChatView } from "@/components/chat/chat-view";
import { api } from "@/convex/_generated/api";
import { useChatRuntime } from "@/lib/chat-runtime";
import { NotFoundPage } from "./not-found";

function ChatLoading() {
  return (
    <main aria-busy="true" className="flex min-w-0 flex-1 flex-col bg-background">
      <div className="h-12 shrink-0 border-b" />
      <div aria-label="Loading chat" className="min-h-0 flex-1" role="status" />
    </main>
  );
}

function Chat({ chatId }: { readonly chatId: string }) {
  const { data: detail } = useQuery(convexQuery(api.chats.get, { chatId }));
  const runtime = useChatRuntime(chatId);

  if (detail === undefined && !runtime) return <ChatLoading />;
  if (detail === null && !runtime) return <NotFoundPage title="Chat not found" />;

  const chat = detail?.chat;
  const checkpointEvents = detail?.events ?? [];
  const title = chat?.title ?? "New chat";

  return <ChatView chat={chat} chatId={chatId} checkpointEvents={checkpointEvents} title={title} />;
}

export function ChatPage() {
  const { chatId } = useParams();
  if (!chatId) return <NotFoundPage />;

  return <Chat chatId={chatId} />;
}
