import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { settingSchemas } from "./index";
import { isAssistantEvent } from "./isAssistantEvent";

const knownTypes = [
  "state",
  "agent",
  "transcript",
  "tool_call",
  "speech",
  "caption",
  "setting_changed",
  "settings_reset",
];

const validSettingChanged = fc.oneof(
  fc.double({ min: 0.5, max: 1.5, noNaN: true }).map((value) => ({
    type: "setting_changed",
    name: "speechRate",
    value,
  })),
  fc.constantFrom(...settingSchemas.captionSize.values).map((value) => ({
    type: "setting_changed",
    name: "captionSize",
    value,
  })),
  fc.boolean().map((value) => ({ type: "setting_changed", name: "highContrast", value })),
  fc.integer({ min: 800, max: 4000 }).map((value) => ({
    type: "setting_changed",
    name: "silenceWaitMs",
    value,
  })),
);

const validEvent = fc.oneof(validSettingChanged, fc.constant({ type: "settings_reset" }));

const anyValue = fc.oneof(fc.double(), fc.string(), fc.boolean(), fc.constant(null), fc.array(fc.integer()));

const unknownName = fc
  .string()
  .filter((name) => !Object.keys(settingSchemas).includes(name));

const invalidCandidate = fc.oneof(
  fc.tuple(unknownName, anyValue).map(([name, value]) => ({ type: "setting_changed", name, value })),
  fc.constantFrom(...Object.keys(settingSchemas)).map((name) => ({ type: "setting_changed", name })),
  fc.oneof(fc.string(), fc.boolean(), fc.constant(null)).map((value) => ({
    type: "setting_changed",
    name: "speechRate",
    value,
  })),
  fc.oneof(fc.double(), fc.boolean(), fc.constant(null)).map((value) => ({
    type: "setting_changed",
    name: "captionSize",
    value,
  })),
  fc.oneof(fc.string(), fc.double(), fc.constant(null)).map((value) => ({
    type: "setting_changed",
    name: "highContrast",
    value,
  })),
  fc.oneof(fc.string(), fc.boolean(), fc.double({ noInteger: true })).map((value) => ({
    type: "setting_changed",
    name: "silenceWaitMs",
    value,
  })),
  fc
    .double()
    .filter((value) => !(value >= 0.5 && value <= 1.5))
    .map((value) => ({ type: "setting_changed", name: "speechRate", value })),
  fc
    .integer()
    .filter((value) => value < 800 || value > 4000)
    .map((value) => ({ type: "setting_changed", name: "silenceWaitMs", value })),
  fc
    .string()
    .filter((type) => !knownTypes.includes(type))
    .map((type) => ({ type })),
  anyValue.map((type) => ({ type, name: "speechRate", value: 1 })),
  fc.constant({ name: "speechRate", value: 1 }),
);

describe("isAssistantEvent properties", () => {
  it("Feature: settings-agent, Property 2: Event guard accepts valid events and rejects invalid ones, with JSON round trip", () => {
    fc.assert(
      fc.property(validEvent, (event) => {
        expect(isAssistantEvent(event)).toBe(true);
        const parsed: unknown = JSON.parse(JSON.stringify(event));
        expect(isAssistantEvent(parsed)).toBe(true);
        expect(parsed).toEqual(event);
      }),
      { numRuns: 200 },
    );

    fc.assert(
      fc.property(invalidCandidate, (candidate) => {
        const before = structuredClone(candidate);
        expect(isAssistantEvent(candidate)).toBe(false);
        expect(candidate).toEqual(before);
      }),
      { numRuns: 300 },
    );
  });
});
