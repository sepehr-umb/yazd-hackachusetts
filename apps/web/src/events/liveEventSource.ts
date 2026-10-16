import { isAssistantEvent } from "@mahmood/contracts";
import type { AssistantEventListener, AssistantEventSource } from "./assistantEventSource";

export type LiveEventSource = AssistantEventSource & { start(): void; stop(): void };

export type LiveEventSourceConfig = {
  url: string;
  createSocket?: (url: string) => WebSocket;
  reconnectDelayMs?: number;
};

function parseEvent(data: unknown) {
  try {
    const event: unknown = JSON.parse(String(data));
    return isAssistantEvent(event) ? event : undefined;
  } catch {
    return undefined;
  }
}

export function createLiveEventSource({
  url,
  createSocket = (target) => new WebSocket(target),
  reconnectDelayMs = 1000,
}: LiveEventSourceConfig): LiveEventSource {
  const listeners = new Set<AssistantEventListener>();
  let running = false;
  let socket: WebSocket | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

  const connect = () => {
    const current = createSocket(url);
    socket = current;
    current.onmessage = (message) => {
      const event = parseEvent(message.data);
      if (event) listeners.forEach((listener) => listener(event));
    };
    current.onclose = () => {
      if (!running || socket !== current) return;
      reconnectTimer = setTimeout(connect, reconnectDelayMs);
    };
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start() {
      if (running) return;
      running = true;
      connect();
    },
    stop() {
      running = false;
      clearTimeout(reconnectTimer);
      socket?.close();
      socket = undefined;
    },
  };
}
