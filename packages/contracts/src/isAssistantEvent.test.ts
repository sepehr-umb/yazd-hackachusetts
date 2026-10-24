import { describe, expect, it } from "vitest";
import { captionSpeakers } from "./events";
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

  it.each(["orchestrator", "comms", "home", "media", "clarifier", "settings"])(
    "accepts the %s agent",
    (agent) => {
      expect(isAssistantEvent({ type: "agent", agent })).toBe(true);
    },
  );

  it("rejects an agent event with an unknown agent", () => {
    expect(isAssistantEvent({ type: "agent", agent: "banker" })).toBe(false);
  });

  it("accepts a transcript event with Farsi text", () => {
    expect(isAssistantEvent({ type: "transcript", text: "به مادرم زنگ بزن" })).toBe(true);
  });

  it("rejects a transcript event whose text is not a string", () => {
    expect(isAssistantEvent({ type: "transcript", text: 7 })).toBe(false);
  });

  it("accepts a speech event with an audio url", () => {
    expect(isAssistantEvent({ type: "speech", audioUrl: "/audio/1.mp3" })).toBe(true);
  });

  it("rejects a speech event with no audio url", () => {
    expect(isAssistantEvent({ type: "speech" })).toBe(false);
  });

  it.each(["started", "succeeded", "failed"])("accepts a tool_call with status %s", (status) => {
    expect(isAssistantEvent({ type: "tool_call", tool: "set_light", status })).toBe(true);
  });

  it("rejects a tool_call with an unknown status", () => {
    expect(isAssistantEvent({ type: "tool_call", tool: "set_light", status: "paused" })).toBe(
      false,
    );
  });

  it("rejects a tool_call whose tool is not a string", () => {
    expect(isAssistantEvent({ type: "tool_call", tool: 1, status: "started" })).toBe(false);
  });

  it("lists the caption speakers", () => {
    expect(captionSpeakers).toEqual(["user", "assistant"]);
  });

  it.each(["user", "assistant"])("accepts a caption event from the %s", (speaker) => {
    expect(isAssistantEvent({ type: "caption", speaker, text: "سلام", english: "Hello" })).toBe(
      true,
    );
  });

  it("rejects a caption event with an unknown speaker", () => {
    expect(
      isAssistantEvent({ type: "caption", speaker: "robot", text: "سلام", english: "Hello" }),
    ).toBe(false);
  });

  it("rejects a caption event whose text is not a string", () => {
    expect(isAssistantEvent({ type: "caption", speaker: "user", text: 1, english: "Hello" })).toBe(
      false,
    );
  });

  it("rejects a caption event with no english", () => {
    expect(isAssistantEvent({ type: "caption", speaker: "user", text: "سلام" })).toBe(false);
  });

  it.each([
    ["speechRate", 0.75],
    ["captionSize", "extra-large"],
    ["highContrast", false],
    ["silenceWaitMs", 2000],
  ])("accepts a setting_changed event for %s", (name, value) => {
    expect(isAssistantEvent({ type: "setting_changed", name, value })).toBe(true);
  });

  it.each([
    ["unknown name", { type: "setting_changed", name: "volume", value: 1 }],
    ["prototype name", { type: "setting_changed", name: "toString", value: 1 }],
    ["missing value", { type: "setting_changed", name: "speechRate" }],
    ["wrong type", { type: "setting_changed", name: "speechRate", value: "fast" }],
    ["out of bounds", { type: "setting_changed", name: "speechRate", value: 2 }],
    ["NaN", { type: "setting_changed", name: "speechRate", value: Number.NaN }],
    ["bad enum", { type: "setting_changed", name: "captionSize", value: "huge" }],
    ["non-integer", { type: "setting_changed", name: "silenceWaitMs", value: 1500.5 }],
  ])("rejects a setting_changed event with %s", (_label, candidate) => {
    expect(isAssistantEvent(candidate)).toBe(false);
  });

  it.each([null, undefined, "setting_changed", 7, [], {}, { type: "nope" }, { type: 3 }])(
    "rejects candidate %j without throwing",
    (candidate) => {
      expect(() => isAssistantEvent(candidate)).not.toThrow();
      expect(isAssistantEvent(candidate)).toBe(false);
    },
  );

  it("does not modify a rejected setting_changed candidate", () => {
    const candidate = { type: "setting_changed", name: "speechRate", value: 9 };
    const copy = structuredClone(candidate);
    isAssistantEvent(candidate);
    expect(candidate).toEqual(copy);
  });
});
