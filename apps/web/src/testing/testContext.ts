import type { AssistantEvent, RequestResult } from "@mahmood/contracts";
import type { AssistantEventListener } from "../events/assistantEventSource";
import type { AudioFrame } from "../face/faceAnimator";
import { createSettingsStore } from "../settings/settingsStore";
import type { SurfaceContext } from "../surfaces/surface";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

export type TestContext = SurfaceContext & {
  emit(event: AssistantEvent): void;
  listenerCount(): number;
  submitted: string[];
  replyWith(result: RequestResult | Error): void;
  holdReply(): (result: RequestResult) => void;
  recorded: Blob[];
  chimes: string[];
  mic: {
    starts: number;
    stops: number;
    level: number;
    refuse(error: Error): void;
  };
  setSpeechFrame(frame: AudioFrame | null): void;
};

export function createTestContext(): TestContext {
  const listeners = new Set<AssistantEventListener>();
  const submitted: string[] = [];
  let reply: RequestResult | Error = { status: "failed", failure: { reason: "unroutable" } };
  let held: Promise<RequestResult> | undefined;
  const recorded: Blob[] = [];
  const chimes: string[] = [];
  const mic = {
    starts: 0,
    stops: 0,
    level: 0,
    refusal: undefined as Error | undefined,
    refuse(error: Error) {
      mic.refusal = error;
    },
  };
  let speechFrame: AudioFrame | null = null;
  const storeListeners = new Set<AssistantEventListener>();
  const events = {
    subscribe(listener: AssistantEventListener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  const storeEvents = {
    subscribe(listener: AssistantEventListener) {
      storeListeners.add(listener);
      return () => storeListeners.delete(listener);
    },
  };
  return {
    settings: createSettingsStore({ events: storeEvents, storage: createMemoryStorage() }),
    submitted,
    recorded,
    chimes,
    mic,
    setSpeechFrame: (frame) => {
      speechFrame = frame;
    },
    speech: { frame: () => speechFrame },
    chime: (kind) => chimes.push(kind),
    microphone: {
      async start() {
        if (mic.refusal) throw mic.refusal;
        mic.starts += 1;
        return {
          level: () => mic.level,
          stop: async () => {
            mic.stops += 1;
            return new Blob(["voice"], { type: "audio/webm" });
          },
        };
      },
    },
    recordings: {
      async submit(recording) {
        recorded.push(recording);
        if (held) return held;
        if (reply instanceof Error) throw reply;
        return reply;
      },
    },
    events,
    requests: {
      async submit(text) {
        submitted.push(text);
        if (held) return held;
        if (reply instanceof Error) throw reply;
        return reply;
      },
    },
    emit: (event) => {
      storeListeners.forEach((listener) => listener(event));
      listeners.forEach((listener) => listener(event));
    },
    listenerCount: () => listeners.size,
    replyWith: (next) => {
      reply = next;
    },
    holdReply() {
      let release: (result: RequestResult) => void = () => {};
      held = new Promise((resolve) => {
        release = resolve;
      });
      return release;
    },
  };
}
