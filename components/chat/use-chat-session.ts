import { useQuery } from "convex/react";
import { Client, type EveMessage, type SessionState } from "eve/client";
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
import {
  createEveMessageProjector,
  projectMessageCreatedAt,
  type StoredEveEvent,
} from "@/lib/eve-events";
import { findPendingInput } from "@/lib/pending-input";

type UseChatSessionOptions = {
  readonly chatId?: string;
  readonly events: readonly StoredEveEvent[];
  readonly initialSession?: SessionState;
  readonly sharedStatus?: ChatStatus;
};

type PendingUserMessage = {
  readonly createdAt: number;
  readonly id: string;
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
  if (error instanceof Error) return error;
  return new Error(fallback);
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
  const [pendingMessage, setPendingMessage] = useState<PendingUserMessage>();
  const [stoppedMessages, setStoppedMessages] = useState<readonly PendingUserMessage[]>([]);
  const [clientSession] = useState(() => new Client({ host: "" }).session(initialSession));
  const agent = useEveAgent({ optimistic: false, session: clientSession });
  const isAgentBusy = agent.status === "submitted" || agent.status === "streaming";

  let startedChatQuery: { sessionId: string } | "skip" = "skip";
  if (!chatId && agent.session.sessionId) {
    startedChatQuery = { sessionId: agent.session.sessionId };
  }
  const startedChatId = useQuery(api.chats.getByEveSession, startedChatQuery);

  const projectMessages = useMemo(createEveMessageProjector, []);
  const persistedMessages = useMemo(() => projectMessages(events), [events, projectMessages]);
  const messageCreatedAt = useMemo(() => projectMessageCreatedAt(events), [events]);
  let messages: readonly EveMessage[] = agent.data.messages;
  if (chatId) messages = persistedMessages;

  const userMessageCount = countUserMessages(messages);
  const visibleStoppedMessages = stoppedMessages.filter(
    (message) => userMessageCount <= message.userMessageCount,
  );
  let visiblePendingMessage: PendingUserMessage | undefined;
  if (pendingMessage && userMessageCount <= pendingMessage.userMessageCount) {
    visiblePendingMessage = pendingMessage;
  }
  const pendingInput = findPendingInput(messages);
  const needsOption = Boolean(pendingInput?.options?.length && !pendingInput.allowFreeform);
  const assistantTextHasStarted =
    !visiblePendingMessage && hasAssistantTextAfterLatestUser(messages);
  const isGenerating = sharedStatus === "running" || isAgentBusy;
  const isWorking = isGenerating || Boolean(visiblePendingMessage);
  const activityLabel = getActivityLabel({
    blocked: Boolean(pendingInput) || assistantTextHasStarted,
    working: isWorking,
  });
  let persistedError: Error | undefined;
  if (sharedStatus === "error" && !isAgentBusy) persistedError = PERSISTED_CHAT_ERROR;
  const error = localError ?? agent.error ?? persistedError;

  useEffect(() => {
    if (pendingMessage && assistantTextHasStarted) setPendingMessage(undefined);
  }, [assistantTextHasStarted, pendingMessage]);

  useEffect(() => {
    if (chatId || isAgentBusy || !startedChatId) return;
    void navigate(href("/c/:chatId", { chatId: startedChatId }), { replace: true });
  }, [chatId, isAgentBusy, navigate, startedChatId]);

  async function send(input: Parameters<typeof agent.send>[0]): Promise<boolean> {
    setLocalError(undefined);
    try {
      await agent.send(input);
      return true;
    } catch (error) {
      setPendingMessage(undefined);
      setLocalError(asError(error, "Could not send message."));
      return false;
    }
  }

  async function sendMessage(message: string): Promise<boolean> {
    if (chatId && pendingInput) {
      return send({ inputResponses: [{ requestId: pendingInput.requestId, text: message }] });
    }

    setPendingMessage({
      createdAt: Date.now(),
      id: crypto.randomUUID(),
      text: message,
      userMessageCount: userMessageCount + visibleStoppedMessages.length,
    });
    return send({ message });
  }

  function answerQuestion(optionId: string): void {
    if (!pendingInput || isGenerating) return;
    void send({ inputResponses: [{ requestId: pendingInput.requestId, optionId }] });
  }

  async function stop(): Promise<void> {
    agent.stop();
    if (visiblePendingMessage) {
      setStoppedMessages((messages) => [...messages, visiblePendingMessage]);
      setPendingMessage(undefined);
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
    isEmpty: messages.length === 0 && !visiblePendingMessage && visibleStoppedMessages.length === 0,
    isGenerating: isWorking,
    latestAssistantMessageId: findLatestAssistantMessageId(messages),
    messageCreatedAt,
    messages,
    needsOption,
    pendingInput,
    sendMessage,
    stop,
    visiblePendingMessages: [
      ...visibleStoppedMessages,
      ...(visiblePendingMessage ? [visiblePendingMessage] : []),
    ],
  };
}
