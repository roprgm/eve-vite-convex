import { defaultMessageReducer, type EveMessage, type HandleMessageStreamEvent } from "eve/client";

export type StoredEveEvent = {
  readonly createdAt?: number;
  readonly event: unknown;
  readonly eventKey: string;
  readonly eveSessionId: string;
};

function isEveEvent(value: unknown): value is HandleMessageStreamEvent {
  return typeof value === "object" && value !== null && "type" in value;
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

export function createEveMessageProjector() {
  const reducer = defaultMessageReducer();
  let data = reducer.initial();
  let eventKeys: string[] = [];

  return (events: readonly StoredEveEvent[]): EveMessage[] => {
    const appendOnly =
      eventKeys.length <= events.length &&
      eventKeys.every((key, index) => events[index]?.eventKey === key);
    if (!appendOnly) {
      data = reducer.initial();
      eventKeys = [];
    }

    for (let index = eventKeys.length; index < events.length; index += 1) {
      const storedEvent = events[index];
      if (!storedEvent) continue;
      eventKeys.push(storedEvent.eventKey);
      if (isEveEvent(storedEvent.event)) {
        data = reducer.reduce(data, namespaceTurn(storedEvent.event, storedEvent.eveSessionId));
      }
    }

    return [...data.messages];
  };
}

export function projectEveMessages(events: readonly StoredEveEvent[]): EveMessage[] {
  return createEveMessageProjector()(events);
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

    const eventTime = "meta" in storedEvent.event ? storedEvent.event.meta?.at : undefined;
    const parsedEventTime = eventTime ? Date.parse(eventTime) : Number.NaN;
    const createdAt = storedEvent.createdAt ?? parsedEventTime;
    if (!Number.isFinite(createdAt)) continue;

    const role = type === "message.received" ? "user" : "assistant";
    const messageId = `${storedEvent.eveSessionId}:${data.turnId}:${role}`;
    if (!createdAtByMessageId.has(messageId)) createdAtByMessageId.set(messageId, createdAt);
  }

  return createdAtByMessageId;
}
