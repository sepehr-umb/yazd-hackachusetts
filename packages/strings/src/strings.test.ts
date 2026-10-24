import { settingSchemas, type SettingName } from "@mahmood/contracts";
import { describe, expect, it } from "vitest";
import { strings } from "./strings";

describe("strings.settings", () => {
  const settingNames = Object.keys(settingSchemas) as SettingName[];

  it("has a non-empty display name for every setting", () => {
    expect(Object.keys(strings.settings.names).sort()).toEqual([...settingNames].sort());
    for (const name of settingNames) {
      expect(strings.settings.names[name].length).toBeGreaterThan(0);
    }
  });

  it("has distinct display names and value labels", () => {
    const labels = [
      ...Object.values(strings.settings.names),
      strings.settings.valueLabels.on,
      strings.settings.valueLabels.off,
    ];
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels.every((label) => label.length > 0)).toBe(true);
  });

  it("has an activity template for changed and reset", () => {
    expect(strings.settings.changed("Speech rate", "0.8")).toContain("Speech rate");
    expect(strings.settings.changed("Speech rate", "0.8")).toContain("0.8");
    expect(strings.settings.reset.length).toBeGreaterThan(0);
  });
});
