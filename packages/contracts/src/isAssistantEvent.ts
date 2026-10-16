import type { AgentName, AssistantEvent, AssistantState } from "./events";

const states: readonly string[] = [
  "idle",
  "listening",
  "thinking",
  "speaking",
  "error",
] satisfies AssistantState[];

const agents: readonly string[] = [
  "orchestrator",
  "comms",
  "home",
  "media",
  "clarifier",
] satisfies AgentName[];

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
      return isOneOf(states, value.state);
    case "agent":
      return isOneOf(agents, value.agent);
    case "transcript":
      return typeof value.text === "string";
    case "speech":
      return typeof value.audioUrl === "string";
    default:
      return false;
  }
}
