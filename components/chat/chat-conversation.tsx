import { ChatMessage, UserMessage } from "@/components/chat/chat-message";
import { ModelActivity } from "@/components/chat/model-activity";
import type { useChatSession } from "@/components/chat/use-chat-session";
import { MessageScrollerItem } from "@/components/ui/message-scroller";

type ChatConversationProps = {
  readonly session: ReturnType<typeof useChatSession>;
};

export function ChatConversation({ session }: ChatConversationProps) {
  if (session.isEmpty) {
    return (
      <MessageScrollerItem className="absolute inset-0 flex max-w-none items-center justify-center text-center">
        <h2 className="text-2xl font-medium tracking-tight">What can I help with?</h2>
      </MessageScrollerItem>
    );
  }

  return (
    <>
      {session.messages.map((message) => (
        <ChatMessage
          createdAt={session.messageCreatedAt.get(message.id)}
          isActive={session.isGenerating && message.metadata?.status === "streaming"}
          key={message.id}
          message={message}
          reasoningSeconds={session.reasoningDurationSeconds.get(message.id)}
        />
      ))}
      {session.visiblePendingMessages.map(({ createdAt, id, text }) => (
        <UserMessage animated createdAt={createdAt} id={id} key={id} text={text} />
      ))}
      {session.activityLabel && (
        <MessageScrollerItem>
          <ModelActivity label={session.activityLabel} />
        </MessageScrollerItem>
      )}
    </>
  );
}
