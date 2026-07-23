import {
  Client,
  type ClientSession,
  type HandleMessageStreamEvent,
  isCurrentTurnBoundaryEvent,
  type SendTurnPayload,
  type SessionState,
} from "eve/client";
import { create } from "zustand";

import { CHAT_ID_HEADER } from "@/lib/chat-identity";
import type { OptimisticChatSubmission, StoredEveEvent } from "@/lib/eve-events";
import { DEFAULT_MODEL_ID, MODEL_HEADER, type ModelId } from "@/lib/models";

type Connection = {
  readonly controller: AbortController;
  index: number;
  readonly session: ClientSession;
  status: "ready" | "running" | "stopped";
  turnId?: string;
};

export type ChatRuntime = {
  readonly connection: Connection;
  readonly error?: string;
  readonly events: readonly StoredEveEvent[];
  readonly optimistic?: OptimisticChatSubmission;
};

type RuntimeStore = {
  readonly chats: Readonly<Record<string, ChatRuntime>>;
};

type SendChatOptions = {
  readonly afterSend?: () => Promise<unknown>;
  readonly beforeSend?: Promise<unknown>;
  readonly modelId?: ModelId;
  readonly sessionState?: SessionState;
};

const client = new Client({ host: "" });
const useRuntimes = create<RuntimeStore>()(() => ({ chats: {} }));

function createConnection(state: SessionState | undefined, streamIndex: number): Connection {
  return {
    controller: new AbortController(),
    index: streamIndex,
    session: client.session({ ...state, streamIndex }),
    status: "running",
  };
}

function resumeConnection(state: SessionState | undefined): Connection | undefined {
  if (!state?.sessionId) return;
  return createConnection(state, state.streamIndex);
}

export function getChatRuntime(chatId: string): ChatRuntime | undefined {
  return useRuntimes.getState().chats[chatId];
}

function setRuntime(chatId: string, next: ChatRuntime): void {
  useRuntimes.setState(({ chats }) => ({ chats: { ...chats, [chatId]: next } }));
}

function updateRuntime(chatId: string, connection: Connection, update: Partial<ChatRuntime>): void {
  useRuntimes.setState((state) => {
    const current = state.chats[chatId];
    if (current?.connection !== connection) return state;
    return { chats: { ...state.chats, [chatId]: { ...current, ...update } } };
  });
}

function optimisticSubmission(
  input: SendTurnPayload,
  startIndex: number,
): OptimisticChatSubmission | undefined {
  const message = typeof input.message === "string" ? input.message : undefined;
  const inputResponses = input.inputResponses?.length ? input.inputResponses : undefined;
  if (!message && !inputResponses) return;
  return {
    createdAt: Date.now(),
    inputResponses,
    message,
    startIndex,
    submissionId: crypto.randomUUID(),
  };
}

function failConnection(chatId: string, connection: Connection, message: string): void {
  if (connection.status === "stopped" || connection.controller.signal.aborted) return;
  connection.status = "ready";
  updateRuntime(chatId, connection, { error: message });
}

function appendEvent(
  chatId: string,
  connection: Connection,
  event: HandleMessageStreamEvent,
): void {
  const current = getChatRuntime(chatId);
  if (current?.connection !== connection) return;
  const index = connection.index;
  connection.index += 1;
  if (event.type === "turn.started") connection.turnId = event.data.turnId;
  const update: Partial<ChatRuntime> = {
    events: [...current.events, { event, index }],
  };
  updateRuntime(chatId, connection, update);
}

async function consumeStream(
  chatId: string,
  connection: Connection,
  stream: AsyncIterable<HandleMessageStreamEvent>,
): Promise<void> {
  try {
    for await (const event of stream) {
      appendEvent(chatId, connection, event);
      if (event.type === "session.failed") {
        failConnection(chatId, connection, "This chat stopped unexpectedly.");
        return;
      }
      if (isCurrentTurnBoundaryEvent(event)) break;
    }
    if (connection.status === "stopped") return;
    connection.status = "ready";
    updateRuntime(chatId, connection, {});
  } catch {
    failConnection(chatId, connection, "Could not stream this chat.");
  }
}

async function cancelTurn(chatId: string, connection: Connection): Promise<void> {
  try {
    await connection.session.cancel({ turnId: connection.turnId });
  } catch {
    connection.status = "ready";
    updateRuntime(chatId, connection, { error: "Could not stop this chat." });
  }
}

async function sendTurn(
  chatId: string,
  connection: Connection,
  input: SendTurnPayload,
  modelId: ModelId,
  beforeSend?: Promise<unknown>,
  afterSend?: () => Promise<unknown>,
): Promise<void> {
  if (beforeSend) {
    try {
      await beforeSend;
    } catch {
      clearChatRuntime(chatId);
      return;
    }
  }

  try {
    const stream = await connection.session.send({
      ...input,
      headers: { ...input.headers, [CHAT_ID_HEADER]: chatId, [MODEL_HEADER]: modelId },
      signal: connection.controller.signal,
    });
    if (afterSend) {
      try {
        await afterSend();
      } catch {
        updateRuntime(chatId, connection, { error: "Could not save this answer." });
      }
    }
    if (connection.status === "stopped") {
      await cancelTurn(chatId, connection);
      connection.controller.abort();
      return;
    }
    await consumeStream(chatId, connection, stream);
  } catch {
    failConnection(chatId, connection, "Could not send message.");
  }
}

export function sendChat(
  chatId: string,
  input: SendTurnPayload,
  { afterSend, beforeSend, modelId = DEFAULT_MODEL_ID, sessionState }: SendChatOptions = {},
): void {
  const current = getChatRuntime(chatId);
  if (current?.connection.status === "running") return;
  const state = sessionState ?? current?.connection.session.state;
  const startIndex = Math.max(state?.streamIndex ?? 0, current?.connection.index ?? 0);
  const connection = createConnection(state, startIndex);
  setRuntime(chatId, {
    connection,
    events: current?.events ?? [],
    optimistic: optimisticSubmission(input, startIndex),
  });
  void sendTurn(chatId, connection, input, modelId, beforeSend, afterSend);
}

export function followChat(chatId: string, state: SessionState): void {
  if (!state.sessionId) return;
  if (getChatRuntime(chatId)) return;
  const connection = createConnection(state, state.streamIndex);
  setRuntime(chatId, {
    connection,
    events: [],
  });
  void consumeStream(
    chatId,
    connection,
    connection.session.stream({ signal: connection.controller.signal }),
  );
}

export async function stopChat(chatId: string, fallback?: SessionState): Promise<void> {
  const current = getChatRuntime(chatId);
  const state = current?.connection.session.state ?? fallback;
  const connection = current?.connection ?? resumeConnection(state);
  if (!connection) return;
  connection.status = "stopped";
  setRuntime(chatId, {
    ...current,
    connection,
    events: current?.events ?? [],
  });
  connection.controller.abort();
  if (!connection.session.state.sessionId) return;
  await cancelTurn(chatId, connection);
}

export function clearChatRuntime(chatId: string): void {
  getChatRuntime(chatId)?.connection?.controller.abort();
  useRuntimes.setState(({ chats }) => {
    const { [chatId]: _forgotten, ...remaining } = chats;
    return { chats: remaining };
  });
}

export function useChatRuntime(chatId: string): ChatRuntime | undefined {
  return useRuntimes((state) => state.chats[chatId]);
}
