import type { AssistantEvent } from "@mahmood/contracts";
import type { EventBus } from "../orchestrator";

export type EventListener = (event: AssistantEvent) => void;

export type EventHub = EventBus & { subscribe(listener: EventListener): () => void };

export function createEventHub(): EventHub {
  const listeners = new Set<EventListener>();
  return {
    emit(event) {
      for (const listener of [...listeners]) listener(event);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
