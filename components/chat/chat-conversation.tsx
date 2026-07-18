import { ChatMessage } from "@/components/chat/chat-message";
import { ModelActivity } from "@/components/chat/model-activity";
import type { useChatSession } from "@/components/chat/use-chat-session";
import { MessageScrollerItem } from "@/components/ui/message-scroller";

type ChatConversationProps = {
  readonly session: ReturnType<typeof useChatSession>;
};

export function ChatConversation({ session }: ChatConversationProps) {
  return (
    <>
      {session.messages.map((message) => (
        <ChatMessage
          createdAt={message.createdAt}
          isActive={session.isGenerating && message.metadata?.status === "streaming"}
          key={message.id}
          message={message}
        />
      ))}
      {session.activityLabel && (
        <MessageScrollerItem>
          <ModelActivity label={session.activityLabel} />
        </MessageScrollerItem>
      )}
    </>
  );
}
