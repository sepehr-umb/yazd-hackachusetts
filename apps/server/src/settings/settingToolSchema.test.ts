import { settingSchemas } from "@mahmood/contracts";
import type { SettingName } from "@mahmood/contracts";
import { describe, expect, it } from "vitest";
import { settingToolDescription, settingToolSchema } from "./settingToolSchema";

describe("settingToolSchema", () => {
  it("derives a bounded number schema for speechRate", () => {
    const { schema, allowed } = settingToolSchema("speechRate");

    expect(schema).toEqual({
      type: "object",
      properties: { value: { type: "number", minimum: 0.5, maximum: 1.5 } },
      required: ["value"],
    });
    expect(allowed).toEqual({ kind: "number", min: 0.5, max: 1.5 });
  });

  it("derives a bounded number schema and integer descriptor for silenceWaitMs", () => {
    const { schema, allowed } = settingToolSchema("silenceWaitMs");

    expect(schema).toEqual({
      type: "object",
      properties: { value: { type: "number", minimum: 800, maximum: 4000 } },
      required: ["value"],
    });
    expect(allowed).toEqual({ kind: "integer", min: 800, max: 4000 });
  });

  it("derives a string enum schema for captionSize", () => {
    const { schema, allowed } = settingToolSchema("captionSize");

    expect(schema).toEqual({
      type: "object",
      properties: {
        value: { type: "string", enum: ["small", "medium", "large", "extra-large"] },
      },
      required: ["value"],
    });
    expect(allowed).toEqual({ kind: "enum", values: ["small", "medium", "large", "extra-large"] });
  });

  it("derives a boolean schema for highContrast", () => {
    const { schema, allowed } = settingToolSchema("highContrast");

    expect(schema).toEqual({
      type: "object",
      properties: { value: { type: "boolean" } },
      required: ["value"],
    });
    expect(allowed).toEqual({ kind: "boolean" });
  });

  it("describes the allowed values of every setting in the tool description", () => {
    const description = settingToolDescription();

    for (const name of Object.keys(settingSchemas) as SettingName[]) {
      expect(description).toContain(name);
    }
    expect(description).toContain("0.5");
    expect(description).toContain("1.5");
    expect(description).toContain("800");
    expect(description).toContain("4000");
    expect(description).toContain("extra-large");
    expect(description).toContain("true or false");
  });
});
