import type { AssistantEvent } from "./events";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isAssistantEvent(value: unknown): value is AssistantEvent {
  return isRecord(value);
}
