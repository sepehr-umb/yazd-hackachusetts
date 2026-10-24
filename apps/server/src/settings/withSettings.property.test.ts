import { isSettingName, isSettingValue, settingSchemas } from "@mahmood/contracts";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createStubTools } from "../orchestrator";
import { createRecordingEventBus } from "../orchestrator/testing/recordingEventBus";
import { withSettings } from "./withSettings";

const names = fc.oneof(
  fc.constantFrom(...Object.keys(settingSchemas)),
  fc.constantFrom("toString", "__proto__", "constructor", ""),
  fc.string(),
);

const values = fc.oneof(
  fc.double({ noNaN: false }),
  fc.integer({ min: 0, max: 5000 }),
  fc.constantFrom("small", "medium", "large", "extra-large", "huge"),
  fc.boolean(),
  fc.string(),
  fc.constantFrom(null, undefined),
);

describe("withSettings update_setting properties", () => {
  it("Feature: settings-agent, Property 8: Update tool emits one event if and only if input is valid", async () => {
    await fc.assert(
      fc.asyncProperty(names, values, async (name, value) => {
        const bus = createRecordingEventBus();
        const tools = withSettings(createStubTools().tools, bus);

        const result = await tools.update_setting.execute({ name, value } as never);

        const valid = isSettingName(name) && isSettingValue(name, value);
        if (valid) {
          expect(bus.events).toEqual([{ type: "setting_changed", name, value }]);
          expect(result).toEqual({ ok: true, output: { applied: true, name, value } });
        } else {
          expect(bus.events).toEqual([]);
          expect(result).toMatchObject({ ok: true, output: { applied: false } });
        }
      }),
      { numRuns: 200 },
    );
  });
});
