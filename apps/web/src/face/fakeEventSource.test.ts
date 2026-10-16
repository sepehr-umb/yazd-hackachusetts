import type { AssistantEvent } from "@mahmood/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeEventSource } from "./fakeEventSource";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function collect(source: ReturnType<typeof createFakeEventSource>) {
  const events: AssistantEvent[] = [];
  source.subscribe((event) => events.push(event));
  return events;
}

describe("createFakeEventSource", () => {
  it("emits the first state as soon as it starts", () => {
    const source = createFakeEventSource({ dwellMs: 1000 });
    const events = collect(source);
    source.start();
    expect(events).toEqual([{ type: "state", state: "idle" }]);
  });

  it("cycles through every state in order and wraps around", () => {
    const source = createFakeEventSource({ dwellMs: 1000 });
    const events = collect(source);
    source.start();
    vi.advanceTimersByTime(5000);
    expect(events.map((event) => event.type === "state" && event.state)).toEqual([
      "idle",
      "listening",
      "thinking",
      "speaking",
      "error",
      "idle",
    ]);
  });
});
