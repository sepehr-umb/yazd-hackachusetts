import { deviceActions } from "./device";
import { agentNames, captionSpeakers, assistantStates, toolCallStatuses } from "./events";
import type { AssistantEvent } from "./events";
import { isSettingName, isSettingValue } from "./isSetting";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf(options: readonly string[], value: unknown): boolean {
  return typeof value === "string" && options.includes(value);
}

function isFilled(value: unknown): boolean {
  return typeof value === "string" && value !== "";
}

function isDeviceAction(value: Record<string, unknown>): boolean {
  const hasTarget =
    isOneOf(deviceActions, value.action) && isFilled(value.phone) && typeof value.contact === "string";
  return hasTarget && (value.action !== "whatsapp_message" || typeof value.text === "string");
}

export function isAssistantEvent(value: unknown): value is AssistantEvent {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case "state":
      return isOneOf(assistantStates, value.state);
    case "agent":
      return isOneOf(agentNames, value.agent);
    case "transcript":
      return typeof value.text === "string";
    case "tool_call":
      return typeof value.tool === "string" && isOneOf(toolCallStatuses, value.status);
    case "speech":
      return typeof value.audioUrl === "string";
    case "caption":
      return (
        isOneOf(captionSpeakers, value.speaker) &&
        typeof value.text === "string" &&
        typeof value.english === "string"
      );
    case "setting_changed":
      return isSettingName(value.name) && isSettingValue(value.name, value.value);
    case "settings_reset":
      return true;
    case "device_action":
      return isDeviceAction(value);
    default:
      return false;
  }
}
