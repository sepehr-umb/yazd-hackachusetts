import { describe, expect, it } from "vitest";
import { createStubTools } from "../orchestrator";
import { createRecordingEventBus } from "../orchestrator/testing/recordingEventBus";
import { withSettings } from "./withSettings";

function setup() {
  const bus = createRecordingEventBus();
  const tools = withSettings(createStubTools().tools, bus);
  return { tools, bus };
}

function errorOf(result: unknown): string {
  const output = (result as { output: { error: string } }).output;
  return output.error;
}

describe("withSettings update_setting", () => {
  it("emits one setting_changed event and reports success for a valid update", async () => {
    const { tools, bus } = setup();

    const result = await tools.update_setting.execute({ name: "speechRate", value: 0.8 });

    expect(result).toEqual({
      ok: true,
      output: { applied: true, name: "speechRate", value: 0.8 },
    });
    expect(bus.events).toEqual([{ type: "setting_changed", name: "speechRate", value: 0.8 }]);
  });

  it.each(["toString", "__proto__", "volume"])(
    "rejects the unknown setting %s and names it in the error",
    async (name) => {
      const { tools, bus } = setup();

      const result = await tools.update_setting.execute({ name, value: 1 } as never);

      expect(result).toMatchObject({ ok: true, output: { applied: false } });
      expect(errorOf(result)).toContain(name);
      expect(bus.events).toEqual([]);
    },
  );

  it.each([
    ["speechRate", 2],
    ["speechRate", 0.1],
    ["silenceWaitMs", 100],
    ["silenceWaitMs", 5000],
  ])("rejects out-of-range %s %s and states the bounds", async (name, value) => {
    const { tools, bus } = setup();

    const result = await tools.update_setting.execute({ name, value } as never);

    expect(result).toMatchObject({
      ok: true,
      output: { applied: false, allowed: { min: expect.any(Number) } },
    });
    expect(errorOf(result)).toMatch(/\d/);
    expect(bus.events).toEqual([]);
  });

  it("states the minimum and maximum in the out-of-range error", async () => {
    const { tools } = setup();

    const result = await tools.update_setting.execute({ name: "speechRate", value: 2 });

    expect(result).toMatchObject({
      ok: true,
      output: { applied: false, allowed: { kind: "number", min: 0.5, max: 1.5 } },
    });
    expect(errorOf(result)).toContain("0.5");
    expect(errorOf(result)).toContain("1.5");
  });

  it.each([
    ["captionSize", "huge"],
    ["highContrast", "yes"],
    ["speechRate", "fast"],
    ["silenceWaitMs", 1500.5],
    ["speechRate", Number.NaN],
    ["silenceWaitMs", Number.POSITIVE_INFINITY],
  ])("rejects the wrong-typed or non-enum value %s %s", async (name, value) => {
    const { tools, bus } = setup();

    const result = await tools.update_setting.execute({ name, value } as never);

    expect(result).toMatchObject({ ok: true, output: { applied: false } });
    expect(bus.events).toEqual([]);
  });

  it("lists the allowed choices when the enum value is not allowed", async () => {
    const { tools } = setup();

    const result = await tools.update_setting.execute({
      name: "captionSize",
      value: "huge",
    } as never);

    expect(errorOf(result)).toContain("extra-large");
    expect(result).toMatchObject({
      output: { allowed: { kind: "enum", values: ["small", "medium", "large", "extra-large"] } },
    });
  });

  it("states the expected type when the value type is wrong", async () => {
    const { tools } = setup();

    const result = await tools.update_setting.execute({
      name: "highContrast",
      value: "yes",
    } as never);

    expect(errorOf(result)).toContain("true or false");
  });
});

describe("withSettings reset_settings", () => {
  it.each([{}, { junk: 1 }])(
    "emits one settings_reset and succeeds for input %j",
    async (input) => {
      const { tools, bus } = setup();

      const result = await tools.reset_settings.execute(input);

      expect(result.ok).toBe(true);
      expect(bus.events).toEqual([{ type: "settings_reset" }]);
    },
  );
});
