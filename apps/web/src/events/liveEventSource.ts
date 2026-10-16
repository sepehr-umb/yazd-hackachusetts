import { isAssistantEvent } from "@mahmood/contracts";
import type { AssistantEventListener, AssistantEventSource } from "./assistantEventSource";

export type LiveEventSource = AssistantEventSource & { start(): void; stop(): void };

export type LiveEventSourceConfig = {
  url: string;
  createSocket?: (url: string) => WebSocket;
  reconnectDelayMs?: number;
};

export function createLiveEventSource({
  url,
  createSocket = (target) => new WebSocket(target),
  reconnectDelayMs = 1000,
}: LiveEventSourceConfig): LiveEventSource {
  const listeners = new Set<AssistantEventListener>();
  let socket: WebSocket | undefined;

  const connect = () => {
    socket = createSocket(url);
    socket.onmessage = (message) => {
      const event: unknown = JSON.parse(String(message.data));
      if (isAssistantEvent(event)) listeners.forEach((listener) => listener(event));
    };
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: connect,
    stop() {},
  };
}
