import type { AssistantEvent } from "./events";

export function isAssistantEvent(value: unknown): value is AssistantEvent {
  return true;
}
