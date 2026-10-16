import type { AssistantEvent, RequestResult } from "@mahmood/contracts";
import type { AssistantEventListener } from "../events/assistantEventSource";
import type { SurfaceContext } from "../surfaces/surface";

export type TestContext = SurfaceContext & {
  emit(event: AssistantEvent): void;
  listenerCount(): number;
  submitted: string[];
  replyWith(result: RequestResult | Error): void;
};

export function createTestContext(): TestContext {
  const listeners = new Set<AssistantEventListener>();
  const submitted: string[] = [];
  let reply: RequestResult | Error = { status: "failed", failure: { reason: "unroutable" } };
  return {
    submitted,
    events: {
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    requests: {
      async submit(text) {
        submitted.push(text);
        if (reply instanceof Error) throw reply;
        return reply;
      },
    },
    emit: (event) => listeners.forEach((listener) => listener(event)),
    listenerCount: () => listeners.size,
    replyWith: (next) => {
      reply = next;
    },
  };
}
