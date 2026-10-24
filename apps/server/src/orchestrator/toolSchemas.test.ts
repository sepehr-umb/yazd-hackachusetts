import { describe, expect, it } from "vitest";
import { settingSchemas } from "@mahmood/contracts";
import { toolSchemas } from "./toolSchemas";

describe("settings tool schemas", () => {
  it("update_setting requires a name enum from the registry and an untyped value", () => {
    const { inputSchema } = toolSchemas.update_setting;
    const properties = inputSchema.properties as Record<string, Record<string, unknown>>;

    expect(properties.name?.enum).toEqual(Object.keys(settingSchemas));
    expect(properties.value).toBeDefined();
    expect(properties.value).not.toHaveProperty("type");
    expect(inputSchema.required).toEqual(["name", "value"]);
  });

  it("reset_settings takes no properties", () => {
    const { inputSchema } = toolSchemas.reset_settings;

    expect(inputSchema.properties).toEqual({});
  });
});

describe("clock tool schema", () => {
  it("get_time takes no properties and requires nothing", () => {
    const schema = toolSchemas.get_time;

    expect(schema.name).toBe("get_time");
    expect(schema.inputSchema.properties).toEqual({});
    expect(schema.inputSchema.required ?? []).toEqual([]);
  });

  it("get_time has a short description mentioning time and day", () => {
    const { description } = toolSchemas.get_time;

    expect(description.length).toBeGreaterThanOrEqual(1);
    expect(description.length).toBeLessThanOrEqual(200);
    expect(description).toMatch(/time/i);
    expect(description).toMatch(/day/i);
  });
});
