import { assistantStates, type AssistantEvent } from "@mahmood/contracts";

export type EventListener = (event: AssistantEvent) => void;

export type FakeEventSource = {
  subscribe(listener: EventListener): () => void;
  start(): void;
  stop(): void;
};

export function createFakeEventSource({ dwellMs = 3000 }: { dwellMs?: number } = {}): FakeEventSource {
  const listeners = new Set<EventListener>();
  let index = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  const emit = (event: AssistantEvent) => listeners.forEach((listener) => listener(event));
  const emitCurrentState = () => emit({ type: "state", state: assistantStates[index] ?? "idle" });

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start() {
      if (timer !== undefined) return;
      emitCurrentState();
      timer = setInterval(() => {
        index = (index + 1) % assistantStates.length;
        emitCurrentState();
      }, dwellMs);
    },
    stop() {
      clearInterval(timer);
      timer = undefined;
    },
  };
}
