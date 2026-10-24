import { defaultSettings, isSettingValue, settingSchemas } from "@mahmood/contracts";
import type { SettingName } from "@mahmood/contracts";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { loadSettings, settingsStorageKey } from "./settingsStorage";

const names = Object.keys(settingSchemas) as SettingName[];

const anyJson = fc.oneof(
  fc.jsonValue(),
  fc.record(
    {
      speechRate: fc.oneof(fc.double(), fc.string(), fc.boolean()),
      captionSize: fc.oneof(
        fc.constantFrom("small", "medium", "large", "extra-large"),
        fc.string(),
        fc.integer(),
      ),
      highContrast: fc.oneof(fc.boolean(), fc.string(), fc.integer()),
      silenceWaitMs: fc.oneof(fc.integer({ min: 0, max: 6000 }), fc.double(), fc.string()),
    },
    { requiredKeys: [] },
  ),
);

const storedString = fc.oneof(
  anyJson.map((value) => JSON.stringify(value)),
  fc.string(),
);

describe("settingsStorage properties", () => {
  it("Feature: settings-agent, Property 7: Load falls back per field", () => {
    fc.assert(
      fc.property(storedString, (stored) => {
        const storage = { getItem: () => stored };
        const loaded = loadSettings(storage);
        let parsed: unknown;
        try {
          parsed = JSON.parse(stored);
        } catch {
          parsed = undefined;
        }
        const object =
          typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : {};
        for (const name of names) {
          const candidate = Object.hasOwn(object, name) ? object[name] : undefined;
          const expected = isSettingValue(name, candidate) ? candidate : defaultSettings[name];
          expect(loaded[name]).toEqual(expected);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("reads only the settings key", () => {
    const asked: string[] = [];
    loadSettings({
      getItem: (key) => {
        asked.push(key);
        return null;
      },
    });
    expect(asked).toEqual([settingsStorageKey]);
  });
});
