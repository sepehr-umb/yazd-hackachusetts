import { settingSchemas } from "@mahmood/contracts";
import type { SettingName } from "@mahmood/contracts";

export type SettingAllowed =
  | { kind: "number" | "integer"; min: number; max: number }
  | { kind: "enum"; values: readonly string[] }
  | { kind: "boolean" };

export type SettingToolSchema = {
  schema: Record<string, unknown>;
  allowed: SettingAllowed;
};

function wrap(value: Record<string, unknown>): Record<string, unknown> {
  return { type: "object", properties: { value }, required: ["value"] };
}

export function settingToolSchema(name: SettingName): SettingToolSchema {
  const entry = settingSchemas[name];
  switch (entry.kind) {
    case "number":
    case "integer":
      return {
        schema: wrap({ type: "number", minimum: entry.min, maximum: entry.max }),
        allowed: { kind: entry.kind, min: entry.min, max: entry.max },
      };
    case "enum":
      return {
        schema: wrap({ type: "string", enum: [...entry.values] }),
        allowed: { kind: "enum", values: entry.values },
      };
    case "boolean":
      return { schema: wrap({ type: "boolean" }), allowed: { kind: "boolean" } };
  }
}

export function describeAllowed(allowed: SettingAllowed): string {
  switch (allowed.kind) {
    case "number":
      return `a number from ${allowed.min} to ${allowed.max}`;
    case "integer":
      return `a whole number from ${allowed.min} to ${allowed.max}`;
    case "enum":
      return `one of ${allowed.values.join(", ")}`;
    case "boolean":
      return "true or false";
  }
}

export function settingToolDescription(): string {
  const parts = (Object.keys(settingSchemas) as SettingName[]).map(
    (name) => `${name}: ${describeAllowed(settingToolSchema(name).allowed)}.`,
  );
  return `Set one assistant setting to an absolute value. ${parts.join(" ")}`;
}
