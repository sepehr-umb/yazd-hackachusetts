import { describe, expect, it } from "vitest";
import { isAssistantEvent } from "./isAssistantEvent";

describe("isAssistantEvent", () => {
  it("accepts a state event", () => {
    expect(isAssistantEvent({ type: "state", state: "idle" })).toBe(true);
  });

  it.each([null, undefined, "state", 42, true, []])("rejects non-object %j", (value) => {
    expect(isAssistantEvent(value)).toBe(false);
  });

  it("rejects an unknown event type", () => {
    expect(isAssistantEvent({ type: "dance" })).toBe(false);
  });

  it("rejects a state event with an unknown state", () => {
    expect(isAssistantEvent({ type: "state", state: "sleeping" })).toBe(false);
  });

  it("rejects a state event with no state", () => {
    expect(isAssistantEvent({ type: "state" })).toBe(false);
  });

  it.each(["idle", "listening", "thinking", "speaking", "error"])(
    "accepts the %s state",
    (state) => {
      expect(isAssistantEvent({ type: "state", state })).toBe(true);
    },
  );

  it.each(["orchestrator", "comms", "home", "media", "clarifier"])(
    "accepts the %s agent",
    (agent) => {
      expect(isAssistantEvent({ type: "agent", agent })).toBe(true);
    },
  );

  it("rejects an agent event with an unknown agent", () => {
    expect(isAssistantEvent({ type: "agent", agent: "banker" })).toBe(false);
  });
});
