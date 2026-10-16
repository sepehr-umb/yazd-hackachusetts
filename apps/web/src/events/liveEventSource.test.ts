import type { AssistantEvent } from "@mahmood/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLiveEventSource } from "./liveEventSource";

class FakeSocket {
  static instances: FakeSocket[] = [];
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  closed = false;

  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  receive(data: string) {
    this.onmessage?.({ data });
  }

  drop() {
    this.onclose?.();
  }
}

function setup() {
  FakeSocket.instances = [];
  const source = createLiveEventSource({
    url: "ws://localhost/events",
    createSocket: (url) => new FakeSocket(url) as unknown as WebSocket,
    reconnectDelayMs: 1000,
  });
  const received: AssistantEvent[] = [];
  source.subscribe((event) => received.push(event));
  return { source, received, socket: () => FakeSocket.instances.at(-1)! };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("createLiveEventSource", () => {
  it("opens the socket on start and delivers each event it receives", () => {
    const { source, received, socket } = setup();

    source.start();
    socket().receive(JSON.stringify({ type: "state", state: "thinking" }));
    socket().receive(JSON.stringify({ type: "agent", agent: "comms" }));

    expect(socket().url).toBe("ws://localhost/events");
    expect(received).toEqual([
      { type: "state", state: "thinking" },
      { type: "agent", agent: "comms" },
    ]);
  });
});
