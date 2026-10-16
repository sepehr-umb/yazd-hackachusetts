import { describe, expect, it } from "vitest";
import { isAssistantEvent } from "./isAssistantEvent";

describe("isAssistantEvent", () => {
  it("accepts a state event", () => {
    expect(isAssistantEvent({ type: "state", state: "idle" })).toBe(true);
  });

  it.each([null, undefined, "state", 42, true, []])("rejects non-object %j", (value) => {
    expect(isAssistantEvent(value)).toBe(false);
  });
});
