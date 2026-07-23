import type {
  ClientSession,
  HandleMessageStreamEvent,
  SendTurnPayload,
  SessionState,
} from "eve/client";
import { expect, it, vi } from "vitest";

type TestSession = Pick<ClientSession, "cancel" | "state"> & {
  send: (input: SendTurnPayload) => Promise<AsyncIterable<HandleMessageStreamEvent>>;
  stream?: ClientSession["stream"];
};

const mock = vi.hoisted(() => ({
  session: undefined as TestSession | undefined,
  sessions: [] as TestSession[],
  states: [] as SessionState[],
}));

vi.mock("eve/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("eve/client")>()),
  Client: class {
    session(state: SessionState) {
      mock.states.push(state);
      const session = mock.sessions.shift() ?? mock.session;
      if (!session) throw new Error("Missing test session.");
      return session;
    }
  },
}));

import { isChatGenerating, isCheckpointed } from "@/components/chat/use-chat-session";
import { CHAT_ID_HEADER, createPublicChatId } from "@/lib/chat-identity";
import {
  clearChatRuntime,
  followChat,
  getChatRuntime,
  sendChat,
  stopChat,
} from "@/lib/chat-runtime";

function event(type: HandleMessageStreamEvent["type"]): HandleMessageStreamEvent {
  if (type === "turn.started") {
    return { data: { sequence: 0, turnId: "turn-1" }, type } as HandleMessageStreamEvent;
  }
  return { type } as HandleMessageStreamEvent;
}

function setSessions(...sessions: TestSession[]): void {
  mock.session = undefined;
  mock.sessions = sessions;
  mock.states = [];
}

function follower(
  stream: ClientSession["stream"],
  state: SessionState = { sessionId: "session-1", streamIndex: 0 },
): TestSession {
  return { cancel: vi.fn(), send: vi.fn(), state, stream };
}

it("creates the optimistic runtime before Eve starts", async () => {
  const chatId = createPublicChatId();
  let finishCreation: () => void = () => undefined;
  const created = new Promise<void>((resolve) => {
    finishCreation = resolve;
  });
  const send = vi.fn(async () =>
    (async function* () {
      yield { type: "session.completed" } as HandleMessageStreamEvent;
    })(),
  );
  setSessions({
    cancel: vi.fn(),
    send,
    state: { streamIndex: 0 },
  });

  sendChat(chatId, { message: "Start now" }, { beforeSend: created });
  expect(getChatRuntime(chatId)?.optimistic?.message).toBe("Start now");
  expect(send).not.toHaveBeenCalled();

  finishCreation();
  await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
  clearChatRuntime(chatId);
});

it("persists an answer after Eve accepts it", async () => {
  const chatId = createPublicChatId();
  const order: string[] = [];
  setSessions({
    cancel: vi.fn(),
    async send() {
      order.push("sent");
      return (async function* () {
        yield { type: "session.completed" } as HandleMessageStreamEvent;
      })();
    },
    state: { continuationToken: "token-1", sessionId: "session-1", streamIndex: 0 },
  });

  sendChat(
    chatId,
    { inputResponses: [{ optionId: "mystery", requestId: "question-1" }] },
    {
      afterSend: async () => {
        order.push("saved");
      },
    },
  );
  expect(getChatRuntime(chatId)?.optimistic?.inputResponses).toEqual([
    { optionId: "mystery", requestId: "question-1" },
  ]);
  await vi.waitFor(() => expect(order).toEqual(["sent", "saved"]));
  clearChatRuntime(chatId);
});

it("shows the optimistic message, then stops locally and cancels Eve", async () => {
  const chatId = createPublicChatId();
  const cancelCalls: Array<{ readonly turnId?: string } | undefined> = [];
  const sent: { input?: SendTurnPayload; signal?: AbortSignal } = {};
  async function* stream() {
    yield {
      data: { sequence: 0, turnId: "turn-1" },
      type: "turn.started",
    } as HandleMessageStreamEvent;
    await new Promise<never>((_resolve, reject) => {
      sent.signal?.addEventListener("abort", () =>
        reject(new DOMException("Aborted", "AbortError")),
      );
    });
  }
  setSessions({
    async cancel(options) {
      cancelCalls.push(options);
      return { sessionId: "session-1", status: "accepted" };
    },
    async send(input) {
      sent.input = input;
      sent.signal = input.signal;
      return stream();
    },
    state: { sessionId: "session-1", streamIndex: 0 },
  });

  sendChat(chatId, { message: "Keep working" });
  expect(sent.input?.headers?.[CHAT_ID_HEADER]).toBe(chatId);
  await vi.waitFor(() => expect(getChatRuntime(chatId)?.connection.turnId).toBe("turn-1"));

  const stopping = stopChat(chatId);
  expect(getChatRuntime(chatId)?.connection.status).toBe("stopped");
  expect(sent.signal?.aborted).toBe(true);
  expect(cancelCalls).toEqual([{ turnId: "turn-1" }]);
  await stopping;
  clearChatRuntime(chatId);
});

it("surfaces a terminal Eve failure", async () => {
  const chatId = createPublicChatId();
  setSessions({
    cancel: vi.fn(),
    async send() {
      return (async function* () {
        yield {
          data: { code: "FatalError", message: "Server Error", sessionId: "session-1" },
          type: "session.failed",
        } as HandleMessageStreamEvent;
      })();
    },
    state: { sessionId: "session-1", streamIndex: 0 },
  });

  sendChat(chatId, { message: "Fail visibly" });
  await vi.waitFor(() => {
    expect(getChatRuntime(chatId)?.connection.status).toBe("settled");
    expect(getChatRuntime(chatId)?.error).toBe("This chat stopped unexpectedly.");
  });
  clearChatRuntime(chatId);
});

it("keeps partial events resumable when a stream ends without a boundary", async () => {
  const chatId = createPublicChatId();
  setSessions({
    cancel: vi.fn(),
    async send() {
      return (async function* () {
        yield event("turn.started");
      })();
    },
    state: { sessionId: "session-1", streamIndex: 0 },
  });

  sendChat(chatId, { message: "Keep the partial answer" });
  await vi.waitFor(() => expect(getChatRuntime(chatId)?.connection.status).toBe("disconnected"));
  expect(getChatRuntime(chatId)?.events).toEqual([{ event: event("turn.started"), index: 0 }]);
  clearChatRuntime(chatId);
});

it("does not duplicate a follower after observing a boundary", async () => {
  const chatId = createPublicChatId();
  const stream = vi.fn(() =>
    (async function* () {
      yield event("session.waiting");
    })(),
  );
  setSessions(follower(stream));

  followChat(chatId, { sessionId: "session-1", streamIndex: 0 });
  await vi.waitFor(() => expect(getChatRuntime(chatId)?.connection.status).toBe("settled"));
  followChat(chatId, { sessionId: "session-1", streamIndex: 0 });

  expect(stream).toHaveBeenCalledOnce();
  expect(mock.states).toHaveLength(1);
  clearChatRuntime(chatId);
});

it("reattaches a disconnected follower from the furthest absolute cursor", async () => {
  const chatId = createPublicChatId();
  const firstStream = vi.fn(() =>
    (async function* () {
      yield event("turn.started");
    })(),
  );
  const secondStream = vi.fn(() =>
    (async function* () {
      yield event("message.appended");
      yield event("session.waiting");
    })(),
  );
  setSessions(follower(firstStream), follower(secondStream));

  followChat(chatId, { sessionId: "session-1", streamIndex: 0 });
  await vi.waitFor(() => expect(getChatRuntime(chatId)?.connection.status).toBe("disconnected"));
  followChat(chatId, { sessionId: "session-1", streamIndex: 0 });
  await vi.waitFor(() => expect(getChatRuntime(chatId)?.connection.status).toBe("settled"));

  expect(mock.states[1]?.streamIndex).toBe(1);
  expect(secondStream).toHaveBeenCalledWith(expect.objectContaining({ startIndex: 1 }));
  expect(getChatRuntime(chatId)?.events.map(({ index }) => index)).toEqual([0, 1, 2]);
  clearChatRuntime(chatId);
});

it("does not start its own reconnect loop after an incomplete stream", async () => {
  const chatId = createPublicChatId();
  const stream = vi.fn(() => (async function* () {})());
  setSessions(follower(stream));

  followChat(chatId, { sessionId: "session-1", streamIndex: 0 });
  await vi.waitFor(() => expect(getChatRuntime(chatId)?.connection.status).toBe("disconnected"));
  await Promise.resolve();

  expect(stream).toHaveBeenCalledOnce();
  expect(mock.states).toHaveLength(1);
  clearChatRuntime(chatId);
});

it("ignores events from a connection after it is replaced", async () => {
  const chatId = createPublicChatId();
  let releaseOld: () => void = () => undefined;
  const oldReady = new Promise<void>((resolve) => {
    releaseOld = resolve;
  });
  const oldStream = vi.fn(() =>
    (async function* () {
      await oldReady;
      yield event("turn.started");
      yield event("session.waiting");
    })(),
  );
  const replacementStream = vi.fn(() =>
    (async function* () {
      yield event("session.waiting");
    })(),
  );
  setSessions(follower(oldStream), follower(replacementStream));

  followChat(chatId, { sessionId: "session-1", streamIndex: 0 });
  const oldConnection = getChatRuntime(chatId)?.connection;
  if (!oldConnection) throw new Error("Missing old connection.");
  oldConnection.status = "disconnected";
  followChat(chatId, { sessionId: "session-1", streamIndex: 0 });
  await vi.waitFor(() => expect(getChatRuntime(chatId)?.connection.status).toBe("settled"));
  releaseOld();
  await vi.waitFor(() => expect(oldStream).toHaveBeenCalledOnce());
  await Promise.resolve();

  expect(oldConnection.controller.signal.aborted).toBe(true);
  expect(getChatRuntime(chatId)?.events).toEqual([{ event: event("session.waiting"), index: 0 }]);
  clearChatRuntime(chatId);
});

it("cancels after incomplete EOF with the session id captured on acceptance", async () => {
  const chatId = createPublicChatId();
  let state: SessionState = { streamIndex: 0 };
  const cancel = vi.fn(async () => ({ sessionId: "session-1", status: "accepted" as const }));
  const acceptedSession: TestSession = {
    cancel: vi.fn(),
    async send() {
      state = { sessionId: "session-1", streamIndex: 0 };
      return (async function* () {
        yield event("turn.started");
        state = { streamIndex: 0 };
      })();
    },
    get state() {
      return state;
    },
  };
  const cancellationSession: TestSession = {
    cancel,
    send: vi.fn(),
    state: { sessionId: "session-1", streamIndex: 1 },
  };
  setSessions(acceptedSession, cancellationSession);

  sendChat(chatId, { message: "Stop after disconnect" });
  await vi.waitFor(() => expect(getChatRuntime(chatId)?.connection.status).toBe("disconnected"));
  await stopChat(chatId);

  expect(mock.states[1]).toEqual({ sessionId: "session-1", streamIndex: 1 });
  expect(cancel).toHaveBeenCalledWith({ turnId: "turn-1" });
  clearChatRuntime(chatId);
});

it("lets a final Convex checkpoint replace an active local transport", () => {
  const chatId = createPublicChatId();
  const stream = vi.fn(() =>
    (async function* () {
      await new Promise<never>(() => undefined);
    })(),
  );
  setSessions(follower(stream));
  followChat(chatId, { sessionId: "session-1", streamIndex: 0 });

  const runtime = getChatRuntime(chatId);
  expect(
    isChatGenerating({ sessionId: "session-1", status: "ready", streamIndex: 0 }, runtime),
  ).toBe(false);
  if (isCheckpointed({ sessionId: "session-1", status: "ready", streamIndex: 0 }, runtime)) {
    clearChatRuntime(chatId);
  }

  expect(runtime?.connection.controller.signal.aborted).toBe(true);
  expect(getChatRuntime(chatId)).toBeUndefined();
});

it.each(["ready", "error"] as const)("does not activate a durable %s chat", (status) => {
  const chatId = createPublicChatId();
  setSessions();
  const durable = { sessionId: "session-1", status, streamIndex: 4 };

  expect(isChatGenerating(durable, undefined)).toBe(false);
  expect(mock.states).toEqual([]);
  expect(getChatRuntime(chatId)).toBeUndefined();
});

it("keeps the optimistic submission active until Convex begins the turn", () => {
  const chatId = createPublicChatId();
  setSessions({
    cancel: vi.fn(),
    async send() {
      await new Promise<never>(() => undefined);
      return (async function* () {})();
    },
    state: { sessionId: "session-1", streamIndex: 0 },
  });

  sendChat(chatId, { message: "Accepted locally" });
  const runtime = getChatRuntime(chatId);
  const durable = { sessionId: "session-1", status: "ready" as const, streamIndex: 0 };

  expect(isChatGenerating(durable, runtime)).toBe(true);
  expect(isCheckpointed(durable, runtime)).toBe(false);
  expect(getChatRuntime(chatId)?.optimistic?.message).toBe("Accepted locally");
  clearChatRuntime(chatId);
});
