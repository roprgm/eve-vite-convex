import { useQuery } from "convex/react";
import {
  Client,
  type EveMessage,
  type HandleMessageStreamEvent,
  type SendTurnPayload,
  type SessionState,
} from "eve/client";
import { useEveAgent } from "eve/react";
import { useEffect, useMemo, useState } from "react";
import { href, useNavigate } from "react-router";

import { api } from "@/convex/_generated/api";
import type { ChatStatus } from "@/lib/chat-logic";
import { useChatStore } from "@/lib/chat-store";
import { namespaceEveMessages, projectEveChat, type StoredEveEvent } from "@/lib/eve-events";
import { MODEL_HEADER } from "@/lib/models";
import { findPendingInput, isSessionLimitRequest } from "@/lib/pending-input";

type UseChatSessionOptions = {
  readonly chatId?: string;
  readonly events: readonly StoredEveEvent[];
  readonly initialEvents?: readonly HandleMessageStreamEvent[];
  readonly initialSession?: SessionState;
  readonly sharedStatus?: ChatStatus;
};

type PendingUserMessage = {
  readonly active: boolean;
  readonly createdAt: number;
  readonly id: string;
  readonly text: string;
  readonly userMessageCount: number;
};

const PERSISTED_CHAT_ERROR = new Error(
  "This chat stopped unexpectedly. Send another message to try again.",
);
const SESSION_TOKEN_LIMIT_ERROR = new Error(
  "This chat has reached its token limit. Start a new chat to continue.",
);

function asError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error;
  return new Error(fallback);
}

function hasAssistantTextAfterLatestUser(messages: readonly EveMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role === "user") return false;
    if (message.parts.some((part) => part.type === "text" && part.text.trim())) return true;
  }
  return false;
}

export function useChatSession({
  chatId,
  events,
  initialEvents,
  initialSession,
  sharedStatus,
}: UseChatSessionOptions) {
  const navigate = useNavigate();
  const selectedModel = useChatStore((state) => state.selectedModel);
  const persisted = useMemo(() => projectEveChat(events), [events]);
  const [localError, setLocalError] = useState<Error>();
  const [pendingMessages, setPendingMessages] = useState<readonly PendingUserMessage[]>([]);
  const [clientSession] = useState(() => new Client({ host: "" }).session(initialSession));
  const [startingEvents] = useState(() => initialEvents ?? persisted.events);
  const agent = useEveAgent({
    initialEvents: startingEvents,
    optimistic: false,
    session: clientSession,
  });
  const isAgentBusy = agent.status === "submitted" || agent.status === "streaming";

  const startedChatId = useQuery(
    api.chats.getByEveSession,
    !chatId && agent.session.sessionId ? { sessionId: agent.session.sessionId } : "skip",
  );

  const localMessages = useMemo(
    () => namespaceEveMessages(agent.data.messages, agent.session.sessionId, events),
    [agent.data.messages, agent.session.sessionId, events],
  );
  const persistedStreamIndex = (events.at(-1)?.index ?? -1) + 1;
  const useLocalMessages = isAgentBusy || agent.session.streamIndex > persistedStreamIndex;
  const messages = useLocalMessages ? localMessages : persisted.messages;

  const userMessageCount = messages.filter((message) => message.role === "user").length;
  const visiblePendingMessages = pendingMessages.filter(
    (message) => userMessageCount <= message.userMessageCount,
  );
  const lastPendingMessage = visiblePendingMessages.at(-1);
  const activePendingMessage = lastPendingMessage?.active ? lastPendingMessage : undefined;
  const pendingInput = findPendingInput(messages);
  const sessionLimitReached = isSessionLimitRequest(pendingInput);
  const visiblePendingInput = sessionLimitReached ? undefined : pendingInput;
  const needsOption = Boolean(
    visiblePendingInput?.options?.length && !visiblePendingInput.allowFreeform,
  );
  const assistantTextHasStarted =
    !activePendingMessage && hasAssistantTextAfterLatestUser(messages);
  const isGenerating = sharedStatus === "running" || isAgentBusy;
  const isWorking = isGenerating || Boolean(activePendingMessage);
  const error = sessionLimitReached
    ? SESSION_TOKEN_LIMIT_ERROR
    : (localError ??
      agent.error ??
      (sharedStatus === "error" && !isAgentBusy ? PERSISTED_CHAT_ERROR : undefined));
  const activityLabel =
    isWorking && !pendingInput && !assistantTextHasStarted && !error ? "Thinking..." : undefined;

  useEffect(() => {
    if (chatId || isAgentBusy || !startedChatId) return;
    void navigate(href("/c/:chatId", { chatId: startedChatId }), {
      replace: true,
      state: {
        chatHandoff: {
          chatId: startedChatId,
          events: agent.events,
          session: agent.session,
        },
      },
    });
  }, [agent.events, agent.session, chatId, isAgentBusy, navigate, startedChatId]);

  async function send(request: SendTurnPayload): Promise<boolean> {
    setLocalError(undefined);
    try {
      await agent.send({
        ...request,
        headers: { ...request.headers, [MODEL_HEADER]: selectedModel },
      });
      return true;
    } catch (error) {
      setLocalError(asError(error, "Could not send message."));
      return false;
    }
  }

  async function sendMessage(message: string): Promise<boolean> {
    if (chatId && pendingInput) {
      return send({ inputResponses: [{ requestId: pendingInput.requestId, text: message }] });
    }

    const pendingMessage: PendingUserMessage = {
      active: true,
      createdAt: Date.now(),
      id: crypto.randomUUID(),
      text: message,
      userMessageCount: userMessageCount + visiblePendingMessages.length,
    };
    setPendingMessages((messages) => [...messages, pendingMessage]);
    const sent = await send({ message });
    if (!sent) {
      setPendingMessages((messages) => messages.filter(({ id }) => id !== pendingMessage.id));
    }
    return sent;
  }

  function answerQuestion(optionId: string): void {
    if (!pendingInput || isGenerating) return;
    void send({ inputResponses: [{ requestId: pendingInput.requestId, optionId }] });
  }

  async function stop(): Promise<void> {
    agent.stop();
    if (activePendingMessage) {
      setPendingMessages((messages) =>
        messages.map((message) =>
          message.id === activePendingMessage.id ? { ...message, active: false } : message,
        ),
      );
    }
    try {
      await clientSession.cancel();
    } catch (error) {
      setLocalError(asError(error, "Could not stop this chat."));
    }
  }

  return {
    answerQuestion,
    activityLabel,
    error,
    isEmpty: messages.length === 0 && visiblePendingMessages.length === 0,
    isGenerating: isWorking && !error,
    messageCreatedAt: persisted.messageCreatedAt,
    messages,
    needsOption,
    pendingInput: visiblePendingInput,
    reasoningDurationSeconds: persisted.reasoningDurationSeconds,
    sendMessage,
    sessionLimitReached,
    stop,
    visiblePendingMessages,
  };
}
