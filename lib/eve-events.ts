import { defaultMessageReducer, type EveMessage, type HandleMessageStreamEvent } from "eve/client";

export type StoredEveEvent = {
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
