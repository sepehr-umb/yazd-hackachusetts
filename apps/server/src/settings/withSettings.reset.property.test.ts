import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createStubTools } from "../orchestrator";
import { createRecordingEventBus } from "../orchestrator/testing/recordingEventBus";
import { withSettings } from "./withSettings";

describe("withSettings reset_settings properties", () => {
  it("Feature: settings-agent, Property 9: Reset tool ignores input", async () => {
    await fc.assert(
      fc.asyncProperty(fc.object(), async (input) => {
        const bus = createRecordingEventBus();
        const tools = withSettings(createStubTools().tools, bus);

        const result = await tools.reset_settings.execute(input);

        expect(result.ok).toBe(true);
        expect(bus.events).toEqual([{ type: "settings_reset" }]);
      }),
      { numRuns: 200 },
    );
  });
});
