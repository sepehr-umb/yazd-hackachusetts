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

  it.each(["not json", "42", '{"type":"dance"}', '{"type":"state","state":"asleep"}'])(
    "ignores the message %s and keeps delivering later events",
    (garbage) => {
      const { source, received, socket } = setup();
      source.start();

      socket().receive(garbage);
      socket().receive(JSON.stringify({ type: "state", state: "idle" }));

      expect(received).toEqual([{ type: "state", state: "idle" }]);
    },
  );

  it("stops delivering to a listener after it unsubscribes", () => {
    const { source, socket } = setup();
    const kept: AssistantEvent[] = [];
    const dropped: AssistantEvent[] = [];
    source.subscribe((event) => kept.push(event));
    const unsubscribe = source.subscribe((event) => dropped.push(event));
    source.start();

    unsubscribe();
    socket().receive(JSON.stringify({ type: "state", state: "idle" }));

    expect(kept).toHaveLength(1);
    expect(dropped).toEqual([]);
  });

  it("reconnects after the reconnect delay when the socket drops", () => {
    vi.useFakeTimers();
    const { source, received, socket } = setup();
    source.start();
    const first = socket();

    first.drop();
    vi.advanceTimersByTime(999);
    expect(FakeSocket.instances).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(FakeSocket.instances).toHaveLength(2);
    socket().receive(JSON.stringify({ type: "state", state: "idle" }));
    expect(received).toEqual([{ type: "state", state: "idle" }]);
  });
});
