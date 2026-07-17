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

function getStoredEventTime(storedEvent: StoredEveEvent): number | undefined {
  const event = storedEvent.event;
  const eventTime = isEveEvent(event) && "meta" in event ? event.meta?.at : undefined;
  const createdAt = storedEvent.createdAt ?? (eventTime ? Date.parse(eventTime) : undefined);
  if (createdAt === undefined || !Number.isFinite(createdAt)) return undefined;
  return createdAt;
}

function namespaceTurn(
  event: HandleMessageStreamEvent,
  sessionId: string,
): HandleMessageStreamEvent {
  const data = "data" in event ? event.data : undefined;
  if (!data || typeof data !== "object" || !("turnId" in data)) return event;

  return {
    ...event,
    data: { ...data, turnId: `${sessionId}:${data.turnId}` },
  } as HandleMessageStreamEvent;
}

export function projectEveEvents(events: readonly StoredEveEvent[]): HandleMessageStreamEvent[] {
  const projectedEvents: HandleMessageStreamEvent[] = [];

  for (const storedEvent of events) {
    if (!isEveEvent(storedEvent.event)) continue;
    projectedEvents.push(namespaceTurn(storedEvent.event, storedEvent.eveSessionId));
  }

  return projectedEvents;
}

export function projectEveMessages(events: readonly StoredEveEvent[]): EveMessage[] {
  const reducer = defaultMessageReducer();
  const data = projectEveEvents(events).reduce(reducer.reduce, reducer.initial());
  return [...data.messages];
}

export function namespaceEveMessages(
  messages: readonly EveMessage[],
  sessionId: string | undefined,
  events: readonly StoredEveEvent[],
): readonly EveMessage[] {
  if (!sessionId) return messages;

  const sessionPrefixes = [...new Set(events.map((event) => `${event.eveSessionId}:`))];
  sessionPrefixes.push(`${sessionId}:`);

  return messages.map((message) => {
    const isNamespaced = sessionPrefixes.some((prefix) => message.id.startsWith(prefix));
    return isNamespaced ? message : { ...message, id: `${sessionId}:${message.id}` };
  });
}

export function projectMessageCreatedAt(
  events: readonly StoredEveEvent[],
): ReadonlyMap<string, number> {
  const createdAtByMessageId = new Map<string, number>();

  for (const storedEvent of events) {
    if (!isEveEvent(storedEvent.event) || !("data" in storedEvent.event)) continue;

    const { data, type } = storedEvent.event;
    if (!data || typeof data !== "object" || !("turnId" in data)) continue;
    if (typeof data.turnId !== "string") continue;

    const createdAt = getStoredEventTime(storedEvent);
    if (createdAt === undefined) continue;

    const role = type === "message.received" ? "user" : "assistant";
    const messageId = `${storedEvent.eveSessionId}:${data.turnId}:${role}`;
    if (!createdAtByMessageId.has(messageId)) createdAtByMessageId.set(messageId, createdAt);
  }

  return createdAtByMessageId;
}

export function projectReasoningDurationSeconds(
  events: readonly StoredEveEvent[],
): ReadonlyMap<string, number> {
  const startedAt = new Map<string, number>();
  const durations = new Map<string, number>();

  for (const storedEvent of events) {
    const event = storedEvent.event;
    if (!isEveEvent(event)) continue;
    if (event.type !== "reasoning.appended" && event.type !== "reasoning.completed") {
      continue;
    }

    const createdAt = getStoredEventTime(storedEvent);
    if (createdAt === undefined) continue;

    const messageId = `${storedEvent.eveSessionId}:${event.data.turnId}:assistant`;
    if (event.type === "reasoning.appended") {
      if (!startedAt.has(messageId)) startedAt.set(messageId, createdAt);
      continue;
    }

    const started = startedAt.get(messageId);
    if (started === undefined) continue;
    durations.set(messageId, Math.max(1, Math.round((createdAt - started) / 1_000)));
  }

  return durations;
}
