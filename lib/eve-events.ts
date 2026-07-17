import { defaultMessageReducer, type EveMessage, type HandleMessageStreamEvent } from "eve/client";

export type StoredEveEvent = {
  readonly createdAt?: number;
  readonly event: unknown;
  readonly eventKey: string;
  readonly eveSessionId: string;
  readonly index?: number;
};

function isEveEvent(value: unknown): value is HandleMessageStreamEvent {
  return typeof value === "object" && value !== null && "type" in value;
}

function getEventTime(storedEvent: StoredEveEvent): number | undefined {
  const event = storedEvent.event;
  const eventTime = isEveEvent(event) && "meta" in event ? event.meta?.at : undefined;
  const createdAt = storedEvent.createdAt ?? (eventTime ? Date.parse(eventTime) : undefined);
  return createdAt !== undefined && Number.isFinite(createdAt) ? createdAt : undefined;
}

function namespaceTurn(event: HandleMessageStreamEvent, sessionId: string) {
  const data = "data" in event ? event.data : undefined;
  if (!data || typeof data !== "object" || !("turnId" in data)) return event;

  return {
    ...event,
    data: { ...data, turnId: `${sessionId}:${data.turnId}` },
  } as HandleMessageStreamEvent;
}

export function projectEveChat(events: readonly StoredEveEvent[]) {
  const projectedEvents: HandleMessageStreamEvent[] = [];
  const messageCreatedAt = new Map<string, number>();
  const reasoningStartedAt = new Map<string, number>();
  const reasoningDurationSeconds = new Map<string, number>();

  for (const storedEvent of events) {
    if (!isEveEvent(storedEvent.event)) continue;
    const event = storedEvent.event;
    projectedEvents.push(namespaceTurn(event, storedEvent.eveSessionId));

    const data = "data" in event ? event.data : undefined;
    if (!data || typeof data !== "object" || !("turnId" in data)) continue;
    if (typeof data.turnId !== "string") continue;
    const createdAt = getEventTime(storedEvent);
    if (createdAt === undefined) continue;

    const role = event.type === "message.received" ? "user" : "assistant";
    const messageId = `${storedEvent.eveSessionId}:${data.turnId}:${role}`;
    if (!messageCreatedAt.has(messageId)) messageCreatedAt.set(messageId, createdAt);
    if (event.type !== "reasoning.appended" && event.type !== "reasoning.completed") continue;

    if (event.type === "reasoning.appended") {
      if (!reasoningStartedAt.has(messageId)) reasoningStartedAt.set(messageId, createdAt);
      continue;
    }

    const started = reasoningStartedAt.get(messageId);
    if (started === undefined) continue;
    reasoningDurationSeconds.set(messageId, Math.max(1, Math.round((createdAt - started) / 1_000)));
  }

  const reducer = defaultMessageReducer();
  const { messages } = projectedEvents.reduce(reducer.reduce, reducer.initial());
  return { events: projectedEvents, messageCreatedAt, messages, reasoningDurationSeconds };
}

export function namespaceEveMessages(
  messages: readonly EveMessage[],
  sessionId: string | undefined,
  events: readonly StoredEveEvent[],
): readonly EveMessage[] {
  if (!sessionId) return messages;

  const prefixes = [...new Set(events.map((event) => `${event.eveSessionId}:`))];
  prefixes.push(`${sessionId}:`);

  return messages.map((message) =>
    prefixes.some((prefix) => message.id.startsWith(prefix))
      ? message
      : { ...message, id: `${sessionId}:${message.id}` },
  );
}
