import { defaultSettings, isSettingValue, settingSchemas } from "@mahmood/contracts";
import type { SettingName, Settings } from "@mahmood/contracts";

export const settingsStorageKey = "yazd.settings";

const names = Object.keys(settingSchemas) as SettingName[];

function readStored(storage: Pick<Storage, "getItem">): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(settingsStorageKey) ?? "");
    const isObject = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
    return isObject ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function loadSettings(storage: Pick<Storage, "getItem">): Settings {
  const stored = readStored(storage);
  const loaded: Record<string, unknown> = { ...defaultSettings };
  for (const name of names) {
    const candidate = Object.hasOwn(stored, name) ? stored[name] : undefined;
    if (isSettingValue(name, candidate)) {
      loaded[name] = candidate;
    }
  }
  return loaded as Settings;
}

export function saveSettings(storage: Pick<Storage, "setItem">, state: Settings): boolean {
  try {
    storage.setItem(settingsStorageKey, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
