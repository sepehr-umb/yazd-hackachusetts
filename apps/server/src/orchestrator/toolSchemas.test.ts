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
