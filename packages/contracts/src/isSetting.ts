import { settingSchemas } from "./settings";
import type { SettingName, Settings } from "./settings";

export function isSettingName(value: unknown): value is SettingName {
  return typeof value === "string" && Object.hasOwn(settingSchemas, value);
}

export function isSettingValue<N extends SettingName>(
  name: N,
  value: unknown,
): value is Settings[N] {
  if (!isSettingName(name)) return false;
  const schema = settingSchemas[name];
  switch (schema.kind) {
    case "number":
      return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= schema.min &&
        value <= schema.max
      );
    case "integer":
      return (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= schema.min &&
        value <= schema.max
      );
    case "enum":
      return typeof value === "string" && (schema.values as readonly string[]).includes(value);
    case "boolean":
      return typeof value === "boolean";
  }
}
