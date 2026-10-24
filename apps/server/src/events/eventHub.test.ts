import type { AssistantEvent } from "@mahmood/contracts";
import { describe, expect, it } from "vitest";
import { createEventHub } from "./eventHub";

describe("createEventHub", () => {
  it("delivers each emitted event to every subscriber in order", () => {
    const hub = createEventHub();
    const first: AssistantEvent[] = [];
    const second: AssistantEvent[] = [];
    hub.subscribe((event) => first.push(event));
    hub.subscribe((event) => second.push(event));

    hub.emit({ type: "state", state: "thinking" });
    hub.emit({ type: "agent", agent: "comms" });

    const expected = [
      { type: "state", state: "thinking" },
      { type: "agent", agent: "comms" },
    ];
    expect(first).toEqual(expected);
    expect(second).toEqual(expected);
  });

  it("stops delivering to a subscriber after it unsubscribes", () => {
    const hub = createEventHub();
    const received: AssistantEvent[] = [];
    const unsubscribe = hub.subscribe((event) => received.push(event));

    hub.emit({ type: "state", state: "thinking" });
    unsubscribe();
    hub.emit({ type: "state", state: "speaking" });

    expect(received).toEqual([{ type: "state", state: "thinking" }]);
  });
});
