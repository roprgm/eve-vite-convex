import { useConvexMutation } from "@convex-dev/react-query";
import { href, useNavigate } from "react-router";

import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatHeader } from "@/components/chat/chat-header";
import { api } from "@/convex/_generated/api";
import { createPublicChatId } from "@/lib/chat-identity";
import { sendChat } from "@/lib/chat-runtime";
import { useChatStore } from "@/lib/chat-store";

export function HomePage() {
  const createChat = useConvexMutation(api.chats.create);
  const navigate = useNavigate();
  const selectedModel = useChatStore((state) => state.selectedModel);

  function sendFirstMessage(message: string): void {
    const chatId = createPublicChatId();
    sendChat(
      chatId,
      { message },
      {
        beforeSend: createChat({ chatId, message }),
        modelId: selectedModel,
      },
    );
    void navigate(href("/c/:chatId", { chatId }));
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-background">
      <ChatHeader title="New chat" />
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-medium tracking-tight">What can I help with?</h2>
      </div>
      <ChatComposer onSend={sendFirstMessage} />
    </main>
  );
}
