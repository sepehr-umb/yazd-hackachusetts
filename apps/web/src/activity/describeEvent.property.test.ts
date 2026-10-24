import { settingSchemas, type AssistantEvent } from "@mahmood/contracts";
import { strings } from "@mahmood/strings";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { describeEvent } from "./describeEvent";

const settingChanged = fc.oneof(
  fc
    .double({
      min: settingSchemas.speechRate.min,
      max: settingSchemas.speechRate.max,
      noNaN: true,
    })
    .map((value): AssistantEvent => ({ type: "setting_changed", name: "speechRate", value })),
  fc
    .constantFrom(...settingSchemas.captionSize.values)
    .map((value): AssistantEvent => ({ type: "setting_changed", name: "captionSize", value })),
  fc
    .boolean()
    .map((value): AssistantEvent => ({ type: "setting_changed", name: "highContrast", value })),
  fc
    .integer({ min: settingSchemas.silenceWaitMs.min, max: settingSchemas.silenceWaitMs.max })
    .map((value): AssistantEvent => ({ type: "setting_changed", name: "silenceWaitMs", value })),
);

function expectedValueText(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? strings.settings.valueLabels.on : strings.settings.valueLabels.off;
  }
  return String(value);
}

describe("describeEvent properties", () => {
  it("Feature: settings-agent, Property 10: Activity description names the change", () => {
    fc.assert(
      fc.property(settingChanged, (event) => {
        if (event.type !== "setting_changed") throw new Error("generator produced another event");
        const { text } = describeEvent(event);
        expect(text.length).toBeGreaterThan(0);
        expect(text).toContain(strings.settings.names[event.name]);
        expect(text).toContain(expectedValueText(event.value));
      }),
      { numRuns: 100 },
    );
  });

  it("Feature: settings-agent, Property 10: reset description is non-empty", () => {
    expect(describeEvent({ type: "settings_reset" }).text.length).toBeGreaterThan(0);
  });
});
