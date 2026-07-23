import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatConversation } from "@/components/chat/chat-conversation";
import { ChatHeader } from "@/components/chat/chat-header";
import { InputRequest } from "@/components/chat/input-request";
import { type StoredChat, useChatSession } from "@/components/chat/use-chat-session";
import { Alert } from "@/components/ui/alert";
import { MessageScroller, MessageScrollerItem } from "@/components/ui/message-scroller";
import type { StoredEveEvent, StoredInputResponse } from "@/lib/eve-events";

type ChatViewProps = {
  readonly chat?: StoredChat;
  readonly chatId: string;
  readonly checkpointEvents: readonly StoredEveEvent[];
  readonly inputResponses: readonly StoredInputResponse[];
  readonly title: string;
};

export function ChatView({ chat, chatId, checkpointEvents, inputResponses, title }: ChatViewProps) {
  const session = useChatSession({
    chat,
    chatId,
    checkpointEvents,
    inputResponses,
  });
  const hasNotices = Boolean(session.pendingInput || session.error);

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-background">
      <ChatHeader title={title} />
      <MessageScroller>
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
            {session.error && (
              <Alert className="my-4 px-4 py-2" variant="destructive">
                {session.error}
              </Alert>
            )}
          </MessageScrollerItem>
        )}
      </MessageScroller>
      <ChatComposer
        disabled={session.disabled}
        isGenerating={session.isGenerating}
        onSend={session.sendMessage}
        onStop={session.stop}
      />
    </main>
  );
}
