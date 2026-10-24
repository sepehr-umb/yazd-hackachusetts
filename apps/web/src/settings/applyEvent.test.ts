import { defaultSettings } from "@mahmood/contracts";
import type { AssistantEvent, Settings } from "@mahmood/contracts";
import { describe, expect, it } from "vitest";
import { applyEvent } from "./applyEvent";

const customState: Settings = {
  speechRate: 0.7,
  captionSize: "small",
  highContrast: false,
  silenceWaitMs: 3000,
};

function invalid(event: unknown): AssistantEvent {
  return event as AssistantEvent;
}

describe("applyEvent", () => {
  it("applies a valid change and leaves the other settings alone", () => {
    const next = applyEvent(defaultSettings, {
      type: "setting_changed",
      name: "speechRate",
      value: 0.8,
    });
    expect(next).toEqual({ ...defaultSettings, speechRate: 0.8 });
  });

  it("applies each setting kind", () => {
    expect(
      applyEvent(defaultSettings, { type: "setting_changed", name: "captionSize", value: "small" })
        .captionSize,
    ).toBe("small");
    expect(
      applyEvent(defaultSettings, { type: "setting_changed", name: "highContrast", value: false })
        .highContrast,
    ).toBe(false);
    expect(
      applyEvent(defaultSettings, { type: "setting_changed", name: "silenceWaitMs", value: 2500 })
        .silenceWaitMs,
    ).toBe(2500);
  });

  it("resets a non-default state to the defaults", () => {
    expect(applyEvent(customState, { type: "settings_reset" })).toEqual(defaultSettings);
  });

  it("resets the default state to the defaults without error", () => {
    expect(applyEvent(defaultSettings, { type: "settings_reset" })).toEqual(defaultSettings);
  });

  it.each([
    ["unknown name", { type: "setting_changed", name: "volume", value: 1 }],
    ["prototype name", { type: "setting_changed", name: "toString", value: 1 }],
    ["NaN", { type: "setting_changed", name: "speechRate", value: NaN }],
    ["Infinity", { type: "setting_changed", name: "speechRate", value: Infinity }],
    ["wrong type", { type: "setting_changed", name: "highContrast", value: "yes" }],
    ["out of bounds", { type: "setting_changed", name: "silenceWaitMs", value: 100 }],
    ["fractional integer", { type: "setting_changed", name: "silenceWaitMs", value: 1500.5 }],
    ["bad caption size", { type: "setting_changed", name: "captionSize", value: "huge" }],
    ["missing value", { type: "setting_changed", name: "speechRate" }],
  ])("returns the identical state for %s", (_label, event) => {
    expect(applyEvent(customState, invalid(event))).toBe(customState);
  });

  it("returns the identical state for an unrelated event", () => {
    expect(applyEvent(customState, { type: "speech", audioUrl: "/a.mp3" })).toBe(customState);
  });
});
