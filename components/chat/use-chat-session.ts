import { useConvexMutation } from "@convex-dev/react-query";
import type { EveMessage, InputResponse, SendTurnPayload, SessionState } from "eve/client";
import { useEffect, useMemo } from "react";

import { api } from "@/convex/_generated/api";
import {
  type ChatRuntime,
  clearChatRuntime,
  followChat,
  sendChat,
  stopChat,
  useChatRuntime,
} from "@/lib/chat-runtime";
import { useChatStore } from "@/lib/chat-store";
import { projectEveChat, type StoredEveEvent, type StoredInputResponse } from "@/lib/eve-events";
import { findPendingInput, isSessionLimitRequest } from "@/lib/pending-input";

export type ChatStatus = "error" | "ready" | "running";
export type StoredChat = SessionState & { readonly status: ChatStatus };

type UseChatSessionOptions = {
  readonly chat?: StoredChat;
  readonly chatId: string;
  readonly checkpointEvents: readonly StoredEveEvent[];
  readonly inputResponses: readonly StoredInputResponse[];
};

function hasAssistantOutputAfterLatestUser(messages: readonly EveMessage[]): boolean {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role === "user") return false;
    if (
      message.parts.some(
        (part) => (part.type === "text" || part.type === "reasoning") && Boolean(part.text.trim()),
      )
    ) {
      return true;
    }
  }
  return false;
}

function chatError(
  limitReached: boolean,
  runtimeError: string | undefined,
  chat: StoredChat | undefined,
): string | undefined {
  if (limitReached) return "This chat has reached its token limit. Start a new chat to continue.";
  if (runtimeError) return runtimeError;
  if (chat?.status !== "error") return;
  if (chat.continuationToken) {
    return "This chat stopped unexpectedly. Send another message to try again.";
  }
  return "This chat ended unexpectedly. Start a new chat to continue.";
}

export function getActivityLabel(
  isGenerating: boolean,
  messages: readonly EveMessage[],
  hasInput: boolean,
  error: string | undefined,
): string | undefined {
  if (!isGenerating) return;
  if (hasInput) return;
  if (hasAssistantOutputAfterLatestUser(messages)) return;
  if (error) return;
  return "Thinking...";
}

function availableInput(input: ReturnType<typeof findPendingInput>) {
  if (isSessionLimitRequest(input)) return;
  return input;
}

function isCheckpointed(chat: StoredChat | undefined, runtime: ChatRuntime | undefined): boolean {
  if (!chat) return false;
  if (!runtime) return false;
  if (!runtime.events.length) return chat.streamIndex > runtime.connection.index;
  return chat.streamIndex >= runtime.connection.index;
}

export function useChatSession({
  chat,
  chatId,
  checkpointEvents,
  inputResponses,
}: UseChatSessionOptions) {
  const recordInputResponse = useConvexMutation(api.chats.recordInputResponse);
  const status = chat?.status;
  const selectedModel = useChatStore((state) => state.selectedModel);
  const runtime = useChatRuntime(chatId);
  const runtimeStatus = runtime?.connection.status;
  const cursor = chat?.streamIndex ?? 0;
  const messages = useMemo(() => {
    const events = runtime?.events.filter((event) => event.index >= cursor) ?? [];
    return projectEveChat([...checkpointEvents, ...events], inputResponses, runtime?.optimistic);
  }, [checkpointEvents, cursor, inputResponses, runtime?.events, runtime?.optimistic]);
  const checkpointed = isCheckpointed(chat, runtime);

  useEffect(() => {
    if (status === "running" && chat) followChat(chatId, chat);
    if (!runtimeStatus || runtimeStatus === "running") return;
    if (checkpointed) clearChatRuntime(chatId);
  }, [chat, chatId, checkpointed, runtimeStatus, status]);

  const pendingInput = findPendingInput(messages);
  const visibleInput = availableInput(pendingInput);
  const sessionLimitReached = isSessionLimitRequest(pendingInput);
  const needsOption = Boolean(visibleInput?.options?.length && !visibleInput.allowFreeform);
  const running = (runtimeStatus ?? status) === "running";
  const ended = Boolean(chat?.sessionId && !chat.continuationToken);
  const isGenerating = running;
  const error = chatError(sessionLimitReached, runtime?.error, chat);
  const canContinue = !sessionLimitReached && !ended;
  const waitingForCheckpoint = Boolean(runtime?.events.length) && !checkpointed;
  const canSend = canContinue && !waitingForCheckpoint;
  const acceptsText = Boolean(chat) && canSend && !needsOption;
  const disabled = running || !acceptsText;

  function send(input: SendTurnPayload, afterSend?: () => Promise<unknown>): void {
    if (!chat) return;
    if (running || !canSend) return;
    sendChat(chatId, input, {
      afterSend,
      modelId: selectedModel,
      sessionState: chat,
    });
  }

  function respond(response: InputResponse): void {
    send({ inputResponses: [response] }, () =>
      recordInputResponse({
        chatId,
        optionId: response.optionId,
        requestId: response.requestId,
        text: response.text,
      }),
    );
  }

  function sendMessage(message: string): void {
    if (!visibleInput) {
      send({ message });
      return;
    }
    respond({ requestId: visibleInput.requestId, text: message });
  }

  function answerQuestion(optionId: string): void {
    if (!visibleInput) return;
    respond({ requestId: visibleInput.requestId, optionId });
  }

  return {
    answerQuestion,
    activityLabel: getActivityLabel(isGenerating, messages, Boolean(pendingInput), error),
    disabled,
    error,
    isGenerating,
    messages,
    pendingInput: visibleInput,
    sendMessage,
    stop: () => stopChat(chatId, chat),
  };
}
