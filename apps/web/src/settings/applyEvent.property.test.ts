import { defaultSettings, isSettingValue, settingSchemas } from "@mahmood/contracts";
import type { AssistantEvent, SettingName, Settings } from "@mahmood/contracts";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { applyEvent } from "./applyEvent";

const names = Object.keys(settingSchemas) as SettingName[];

const validState: fc.Arbitrary<Settings> = fc.record({
  speechRate: fc.double({ min: 0.5, max: 1.5, noNaN: true }),
  captionSize: fc.constantFrom("small", "medium", "large", "extra-large"),
  highContrast: fc.boolean(),
  silenceWaitMs: fc.integer({ min: 800, max: 4000 }),
});

const inBoundsEvent: fc.Arbitrary<AssistantEvent> = fc.oneof(
  fc.double({ min: 0.5, max: 1.5, noNaN: true }).map(
    (value): AssistantEvent => ({ type: "setting_changed", name: "speechRate", value }),
  ),
  fc.constantFrom("small", "medium", "large", "extra-large").map(
    (value): AssistantEvent => ({ type: "setting_changed", name: "captionSize", value }),
  ),
  fc.boolean().map(
    (value): AssistantEvent => ({ type: "setting_changed", name: "highContrast", value }),
  ),
  fc.integer({ min: 800, max: 4000 }).map(
    (value): AssistantEvent => ({ type: "setting_changed", name: "silenceWaitMs", value }),
  ),
);

const anyValue = fc.oneof(
  fc.double(),
  fc.integer({ min: -1000, max: 6000 }),
  fc.constantFrom(NaN, Infinity, -Infinity, 1500.5),
  fc.boolean(),
  fc.string(),
  fc.constantFrom(null, undefined),
);

const unknownName = fc.string().filter((name) => !names.includes(name as SettingName));

const knownNameBadValue = fc
  .tuple(fc.constantFrom(...names), anyValue)
  .filter(([name, value]) => !isSettingValue(name, value));

const invalidEvent: fc.Arbitrary<AssistantEvent> = fc.oneof(
  fc.tuple(unknownName, anyValue),
  knownNameBadValue,
).map(([name, value]) => ({ type: "setting_changed", name, value }) as unknown as AssistantEvent);

const mixedEvent = fc.oneof(inBoundsEvent, invalidEvent);

describe("applyEvent properties", () => {
  it("Feature: settings-agent, Property 3: Settings stay within bounds under any event sequence", () => {
    fc.assert(
      fc.property(fc.array(mixedEvent, { minLength: 0, maxLength: 50 }), (events) => {
        let state = defaultSettings;
        for (const event of events) {
          state = applyEvent(state, event);
          for (const name of names) {
            expect(isSettingValue(name, state[name])).toBe(true);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it("Feature: settings-agent, Property 4: Invalid events leave state unchanged", () => {
    fc.assert(
      fc.property(validState, invalidEvent, (state, event) => {
        const snapshot = structuredClone(state);
        expect(applyEvent(state, event)).toEqual(snapshot);
      }),
      { numRuns: 100 },
    );
  });

  it("Feature: settings-agent, Property 5: Reset yields defaults and is idempotent", () => {
    fc.assert(
      fc.property(validState, (state) => {
        const once = applyEvent(state, { type: "settings_reset" });
        const twice = applyEvent(once, { type: "settings_reset" });
        expect(once).toEqual(defaultSettings);
        expect(twice).toEqual(once);
      }),
      { numRuns: 100 },
    );
  });
});
