import type { AssistantEvent, AssistantState } from "./events";

const states: readonly string[] = [
  "idle",
  "listening",
  "thinking",
  "speaking",
  "error",
] satisfies AssistantState[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isAssistantEvent(value: unknown): value is AssistantEvent {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case "state":
      return typeof value.state === "string" && states.includes(value.state);
    default:
      return false;
  }
}
