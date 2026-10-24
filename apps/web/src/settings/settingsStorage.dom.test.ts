import type { Settings } from "@mahmood/contracts";
import fc from "fast-check";
import { afterEach, describe, expect, it } from "vitest";
import { loadSettings, saveSettings } from "./settingsStorage";

const validState: fc.Arbitrary<Settings> = fc.record({
  speechRate: fc.double({ min: 0.5, max: 1.5, noNaN: true }),
  captionSize: fc.constantFrom("small", "medium", "large", "extra-large"),
  highContrast: fc.boolean(),
  silenceWaitMs: fc.integer({ min: 800, max: 4000 }),
});

describe("settingsStorage with localStorage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("Feature: settings-agent, Property 6: Persistence round trip", () => {
    fc.assert(
      fc.property(validState, (state) => {
        expect(saveSettings(localStorage, state)).toBe(true);
        expect(loadSettings(localStorage)).toEqual(state);
      }),
      { numRuns: 100 },
    );
  });
});
