import type { AssistantEvent } from "@mahmood/contracts";
import type { EventBus } from "../eventBus";

export type RecordingEventBus = EventBus & { events: AssistantEvent[] };

export function createRecordingEventBus(): RecordingEventBus {
  const events: AssistantEvent[] = [];
  return {
    events,
    emit(event) {
      events.push(event);
    },
  };
}
