import {
  type ClientInputRespondedEvent,
  type ClientMessageSubmittedEvent,
  defaultMessageReducer,
  type EveAgentReducerEvent,
  type EveMessage,
  type HandleMessageStreamEvent,
  type InputResponse,
} from "eve/client";

export type OptimisticChatSubmission = {
  readonly createdAt: number;
  readonly inputResponses?: readonly InputResponse[];
  readonly message?: string;
  readonly startIndex: number;
  readonly submissionId: string;
};

export type StoredInputResponse = InputResponse & {
  readonly createdAt: number;
};

export type StoredEveEvent = {
  readonly event: HandleMessageStreamEvent;
  readonly index: number;
};

type ProjectedEveMessage = EveMessage & { readonly createdAt?: number };

function optimisticEvent(
  optimistic: OptimisticChatSubmission,
  message: string,
): EveAgentReducerEvent {
  return {
    data: {
      createdAt: optimistic.createdAt,
      message,
      submissionId: optimistic.submissionId,
    },
    type: "client.message.submitted",
  } satisfies ClientMessageSubmittedEvent;
}

function inputResponseEvent(response: StoredInputResponse): ClientInputRespondedEvent {
  return {
    data: {
      createdAt: response.createdAt,
      responses: [
        {
          optionId: response.optionId,
          requestId: response.requestId,
          text: response.text,
        },
      ],
    },
    type: "client.input.responded",
  };
}

function projectInputResponses(
  events: readonly HandleMessageStreamEvent[],
  responses: ReadonlyMap<string, StoredInputResponse>,
): EveAgentReducerEvent[] {
  const projected: EveAgentReducerEvent[] = [];
  for (const event of events) {
    projected.push(event);
    if (event.type !== "input.requested") continue;
    for (const request of event.data.requests) {
      const response = responses.get(request.requestId);
      if (response) projected.push(inputResponseEvent(response));
    }
  }
  return projected;
}

export function projectEveChat(
  storedEvents: readonly StoredEveEvent[],
  storedInputResponses: readonly StoredInputResponse[],
  optimistic?: OptimisticChatSubmission,
): readonly ProjectedEveMessage[] {
  const inputResponses = new Map(
    storedInputResponses.map((response) => [response.requestId, response]),
  );
  if (optimistic) {
    for (const response of optimistic.inputResponses ?? []) {
      inputResponses.set(response.requestId, {
        ...response,
        createdAt: optimistic.createdAt,
      });
    }
  }

  const startIndex = optimistic?.startIndex ?? Number.POSITIVE_INFINITY;
  const before = storedEvents
    .filter((stored) => stored.index < startIndex)
    .map(({ event }) => event);
  const after = storedEvents
    .filter((stored) => stored.index >= startIndex)
    .map(({ event }) => event);
  const projected = projectInputResponses(before, inputResponses);
  const received = after.find((event) => event.type === "message.received");
  if (optimistic?.message && !received) {
    projected.push(optimisticEvent(optimistic, optimistic.message));
  }
  projected.push(...projectInputResponses(after, inputResponses));

  const createdAt = new Map<string, number>();
  for (const { event } of storedEvents) {
    const timestamp = Date.parse(event.meta?.at ?? "");
    if (!Number.isFinite(timestamp)) continue;
    if (event.type === "turn.started") {
      createdAt.set(`${event.data.turnId}:assistant`, timestamp);
    }
    if (event.type === "message.received") {
      createdAt.set(`${event.data.turnId}:user`, timestamp);
    }
  }
  if (optimistic) {
    createdAt.set(`optimistic:${optimistic.submissionId}:user`, optimistic.createdAt);
  }
  if (optimistic && received) {
    createdAt.set(`${received.data.turnId}:user`, optimistic.createdAt);
  }

  const reducer = defaultMessageReducer();
  const { messages } = projected.reduce(reducer.reduce, reducer.initial());
  return messages.map((message) => {
    const timestamp = createdAt.get(message.id);
    if (timestamp === undefined) return message;
    return { ...message, createdAt: timestamp };
  });
}
