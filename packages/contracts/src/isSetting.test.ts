import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { isSettingName, isSettingValue, settingSchemas } from "./index";
import type { SettingName } from "./index";

const names = Object.keys(settingSchemas) as SettingName[];

function satisfiesRegistry(name: SettingName, value: unknown): boolean {
  const schema = settingSchemas[name];
  switch (schema.kind) {
    case "number":
      return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= schema.min &&
        value <= schema.max
      );
    case "integer":
      return (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= schema.min &&
        value <= schema.max
      );
    case "enum":
      return typeof value === "string" && (schema.values as readonly string[]).includes(value);
    case "boolean":
      return typeof value === "boolean";
  }
}

const anyValue = fc.oneof(
  fc.double({ noNaN: false }),
  fc.integer({ min: -1000, max: 5000 }),
  fc.double({ min: 0.4, max: 1.6 }),
  fc.constantFrom(NaN, Infinity, -Infinity, 800, 4000, 799, 4001, 0.5, 1.5, 1500.5),
  fc.boolean(),
  fc.string(),
  fc.constantFrom("small", "medium", "large", "extra-large", "huge", "Large"),
  fc.constantFrom(null, undefined),
  fc.array(fc.integer()),
  fc.object(),
);

describe("isSettingName", () => {
  it("accepts the four setting names", () => {
    for (const name of names) {
      expect(isSettingName(name)).toBe(true);
    }
  });

  it("rejects unknown names and prototype names", () => {
    for (const name of ["volume", "", "toString", "__proto__", "constructor", "hasOwnProperty"]) {
      expect(isSettingName(name)).toBe(false);
    }
  });

  it("rejects non-string inputs", () => {
    for (const value of [null, undefined, 1, true, {}, [], ["speechRate"]]) {
      expect(isSettingName(value)).toBe(false);
    }
  });

  it("rejects any string that is not a registry key", () => {
    fc.assert(
      fc.property(fc.string(), (value) => isSettingName(value) === names.includes(value as SettingName)),
      { numRuns: 100 },
    );
  });
});

describe("isSettingValue", () => {
  it("accepts in-bounds examples", () => {
    expect(isSettingValue("speechRate", 0.5)).toBe(true);
    expect(isSettingValue("speechRate", 1.5)).toBe(true);
    expect(isSettingValue("captionSize", "extra-large")).toBe(true);
    expect(isSettingValue("highContrast", false)).toBe(true);
    expect(isSettingValue("silenceWaitMs", 800)).toBe(true);
    expect(isSettingValue("silenceWaitMs", 4000)).toBe(true);
  });

  it("rejects invalid examples", () => {
    expect(isSettingValue("speechRate", 1.51)).toBe(false);
    expect(isSettingValue("speechRate", NaN)).toBe(false);
    expect(isSettingValue("speechRate", Infinity)).toBe(false);
    expect(isSettingValue("speechRate", "1")).toBe(false);
    expect(isSettingValue("captionSize", "huge")).toBe(false);
    expect(isSettingValue("highContrast", "yes")).toBe(false);
    expect(isSettingValue("silenceWaitMs", 1500.5)).toBe(false);
    expect(isSettingValue("silenceWaitMs", 799)).toBe(false);
  });

  it("Feature: settings-agent, Property 1: Setting value guard matches the registry", () => {
    fc.assert(
      fc.property(fc.constantFrom(...names), anyValue, (name, value) => {
        expect(isSettingValue(name, value)).toBe(satisfiesRegistry(name, value));
      }),
      { numRuns: 500 },
    );
  });

  it("Feature: settings-agent, Property 1: non-names are never setting names", () => {
    fc.assert(
      fc.property(anyValue, (value) => {
        expect(isSettingName(value)).toBe(
          typeof value === "string" && names.includes(value as SettingName),
        );
      }),
      { numRuns: 200 },
    );
  });
});
