import { ChatMessage, UserMessage } from "@/components/chat/chat-message";
import { ModelActivity } from "@/components/chat/model-activity";
import type { useChatSession } from "@/components/chat/use-chat-session";

type ChatConversationProps = {
  readonly session: ReturnType<typeof useChatSession>;
};

export function ChatConversation({ session }: ChatConversationProps) {
  if (session.isEmpty && !session.activityLabel) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-center">
        <h2 className="text-2xl font-medium tracking-tight">What can I help with?</h2>
      </div>
    );
  }

  return (
    <div aria-live="polite" className="py-5" role="log">
      {session.messages.map((message) => {
        const isActive =
          session.isGenerating &&
          message.role === "assistant" &&
          message.id === session.latestAssistantMessageId;
        return <ChatMessage isActive={isActive} key={message.id} message={message} />;
      })}
      {session.visiblePendingTexts.map((text, index) => (
        <UserMessage key={`${index}:${text}`} text={text} />
      ))}
      {session.activityLabel && <ModelActivity label={session.activityLabel} />}
    </div>
  );
}
