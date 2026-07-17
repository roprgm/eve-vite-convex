import { useQuery } from "convex/react";
import type { SessionState } from "eve/client";
import { useEveAgent } from "eve/react";
import { useEffect, useMemo, useState } from "react";
import { href, useNavigate } from "react-router";

import { api } from "@/convex/_generated/api";
import type { ChatStatus } from "@/lib/chat-logic";
import {
  countUserMessages,
  findLatestAssistantMessageId,
  hasAssistantTextAfterLatestUser,
} from "@/lib/chat-message-utils";
import { createEveMessageProjector, type StoredEveEvent } from "@/lib/eve-events";
import { findPendingInput } from "@/lib/pending-input";

type UseChatSessionOptions = {
  readonly chatId?: string;
  readonly events: readonly StoredEveEvent[];
  readonly initialSession?: SessionState;
  readonly sharedStatus?: ChatStatus;
};

type OptimisticUserMessage = {
  readonly text: string;
  readonly userMessageCount: number;
};

type ActivityState = {
  readonly blocked: boolean;
  readonly working: boolean;
};

const PERSISTED_CHAT_ERROR = new Error(
  "This chat stopped unexpectedly. Send another message to try again.",
);

function asError(error: unknown, fallback: string): Error {
  return error instanceof Error ? error : new Error(fallback);
}

function getActivityLabel({ blocked, working }: ActivityState): string | undefined {
  if (!working || blocked) return undefined;
  return "Thinking...";
}

export function useChatSession({
  chatId,
  events,
  initialSession,
  sharedStatus,
}: UseChatSessionOptions) {
  const navigate = useNavigate();
  const [localError, setLocalError] = useState<Error>();
  const [optimisticMessage, setOptimisticMessage] = useState<OptimisticUserMessage>();
  const agent = useEveAgent({
    initialSession,
    optimistic: false,
  });
  const startedSessionId = agent.session.sessionId;
  const startedChatId = useQuery(
    api.chats.getByEveSession,
    !chatId && startedSessionId ? { sessionId: startedSessionId } : "skip",
  );
  const startedChat = useQuery(api.chats.get, startedChatId ? { id: startedChatId } : "skip");
  const projectMessages = useMemo(createEveMessageProjector, []);
  const persistedMessages = useMemo(() => projectMessages(events), [events, projectMessages]);
  const messages = chatId ? persistedMessages : agent.data.messages;
  const userMessageCount = countUserMessages(messages);
  const visibleOptimisticMessage =
    optimisticMessage && userMessageCount <= optimisticMessage.userMessageCount
      ? optimisticMessage
      : undefined;
  const pendingInput = findPendingInput(messages);
  const needsOption = Boolean(pendingInput?.options?.length && !pendingInput.allowFreeform);
  const assistantTextHasStarted =
    !visibleOptimisticMessage && hasAssistantTextAfterLatestUser(messages);
  const isAgentBusy = agent.status === "submitted" || agent.status === "streaming";
  const activityLabel = getActivityLabel({
    blocked: Boolean(pendingInput) || assistantTextHasStarted,
    working: isAgentBusy || sharedStatus === "running" || Boolean(optimisticMessage),
  });
  const latestAssistantMessageId = findLatestAssistantMessageId(messages);
  const isBusy = sharedStatus === "running" || isAgentBusy;
  const persistedError =
    sharedStatus === "error" && !isAgentBusy ? PERSISTED_CHAT_ERROR : undefined;
  const error = localError ?? agent.error ?? persistedError;

  useEffect(() => {
    if (optimisticMessage && assistantTextHasStarted) {
      setOptimisticMessage(undefined);
    }
  }, [assistantTextHasStarted, optimisticMessage]);

  useEffect(() => {
    if (chatId || isAgentBusy || !startedChatId || !startedChat) return;
    void navigate(href("/c/:chatId", { chatId: startedChatId }), { replace: true });
  }, [chatId, isAgentBusy, navigate, startedChat, startedChatId]);

  async function send(input: Parameters<typeof agent.send>[0]): Promise<boolean> {
    setLocalError(undefined);
    try {
      await agent.send(input);
      return true;
    } catch (error) {
      setOptimisticMessage(undefined);
      setLocalError(asError(error, "Could not send message."));
      return false;
    }
  }

  async function sendMessage(message: string): Promise<boolean> {
    if (!chatId) {
      setOptimisticMessage({ text: message, userMessageCount });
      return send({ message });
    }
    if (pendingInput) {
      return send({ inputResponses: [{ requestId: pendingInput.requestId, text: message }] });
    }
    setOptimisticMessage({ text: message, userMessageCount });
    return send({ message });
  }

  function answerQuestion(optionId: string): void {
    if (!pendingInput || isBusy) return;
    void send({ inputResponses: [{ requestId: pendingInput.requestId, optionId }] });
  }

  return {
    answerQuestion,
    activityLabel,
    error,
    isBusy,
    isEmpty: messages.length === 0 && !visibleOptimisticMessage,
    isStreaming: isAgentBusy || sharedStatus === "running",
    latestAssistantMessageId,
    messages,
    needsOption,
    pendingInput,
    sendMessage,
    stop: agent.stop,
    visibleOptimisticText: visibleOptimisticMessage?.text,
  };
}
