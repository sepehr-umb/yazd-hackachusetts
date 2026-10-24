import { defaultSettings, isSettingName, isSettingValue } from "@mahmood/contracts";
import type { AssistantEvent, Settings } from "@mahmood/contracts";

export function applyEvent(state: Settings, event: AssistantEvent): Settings {
  if (event.type === "settings_reset") {
    return { ...defaultSettings };
  }
  if (event.type !== "setting_changed") {
    return state;
  }
  if (!isSettingName(event.name) || !isSettingValue(event.name, event.value)) {
    return state;
  }
  return { ...state, [event.name]: event.value };
}
