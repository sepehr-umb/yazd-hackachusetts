import { describe, expect, it } from "vitest";
import { isAssistantEvent } from "./isAssistantEvent";

describe("isAssistantEvent", () => {
  it("accepts a state event", () => {
    expect(isAssistantEvent({ type: "state", state: "idle" })).toBe(true);
  });
});
