import { defaultSettings } from "@mahmood/contracts";
import { describe, expect, it } from "vitest";
import { createTestContext } from "../testing/testContext";

describe("surface context settings", () => {
  it("exposes the default settings to a mounted surface", () => {
    const context = createTestContext();

    expect(context.settings.get()).toEqual(defaultSettings);
  });

  it("applies setting events emitted through the test context", () => {
    const context = createTestContext();

    context.emit({ type: "setting_changed", name: "speechRate", value: 0.8 });

    expect(context.settings.get().speechRate).toBe(0.8);
  });
});
