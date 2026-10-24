import { agentNames, captionSpeakers, assistantStates, toolCallStatuses } from "./events";
import type { AssistantEvent } from "./events";
import { isSettingName, isSettingValue } from "./isSetting";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf(options: readonly string[], value: unknown): boolean {
  return typeof value === "string" && options.includes(value);
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
    default:
      return false;
  }
}
