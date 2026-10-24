import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { defaultSettings, settingSchemas } from "./index";
import type { SettingName } from "./index";

describe("settingSchemas", () => {
  it("defines exactly the four settings", () => {
    expect(Object.keys(settingSchemas)).toEqual([
      "speechRate",
      "captionSize",
      "highContrast",
      "silenceWaitMs",
    ]);
  });

  it("bounds speechRate from 0.5 to 1.5", () => {
    expect(settingSchemas.speechRate).toMatchObject({ kind: "number", min: 0.5, max: 1.5 });
  });

  it("limits captionSize to four sizes", () => {
    expect(settingSchemas.captionSize).toMatchObject({
      kind: "enum",
      values: ["small", "medium", "large", "extra-large"],
    });
  });

  it("makes highContrast a boolean", () => {
    expect(settingSchemas.highContrast.kind).toBe("boolean");
  });

  it("bounds silenceWaitMs to integers from 800 to 4000", () => {
    expect(settingSchemas.silenceWaitMs).toMatchObject({ kind: "integer", min: 800, max: 4000 });
  });
});

describe("defaultSettings", () => {
  it("holds the documented defaults", () => {
    expect(defaultSettings).toEqual({
      speechRate: 1.0,
      captionSize: "large",
      highContrast: true,
      silenceWaitMs: 1500,
    });
  });

  it("Feature: settings-agent, Property: every default satisfies its own bounds", () => {
    const names = Object.keys(settingSchemas) as SettingName[];
    fc.assert(
      fc.property(fc.constantFrom(...names), (name) => {
        const schema = settingSchemas[name];
        const value = defaultSettings[name];
        expect(value).toBe(schema.default);
        if (schema.kind === "number" || schema.kind === "integer") {
          expect(typeof value).toBe("number");
          expect(Number.isFinite(value)).toBe(true);
          expect(value as number).toBeGreaterThanOrEqual(schema.min);
          expect(value as number).toBeLessThanOrEqual(schema.max);
          if (schema.kind === "integer") expect(Number.isInteger(value)).toBe(true);
        } else if (schema.kind === "enum") {
          expect(schema.values as readonly unknown[]).toContain(value);
        } else {
          expect(typeof value).toBe("boolean");
        }
      }),
      { numRuns: 100 },
    );
  });
});
