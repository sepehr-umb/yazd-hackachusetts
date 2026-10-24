import { agentNames } from "./events";
import type { RequestResult } from "./requests";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSubAgent(value: unknown): boolean {
  return (
    typeof value === "string" && value !== "orchestrator" && agentNames.some((n) => n === value)
  );
}

export function isRequestResult(value: unknown): value is RequestResult {
  if (!isRecord(value)) return false;
  switch (value.status) {
    case "succeeded":
      return isSubAgent(value.agent) && typeof value.reply === "string";
    case "clarification":
      return value.agent === "clarifier" && typeof value.question === "string";
    case "failed":
      return (
        (value.agent === undefined || isSubAgent(value.agent)) &&
        isRecord(value.failure) &&
        typeof value.failure.reason === "string"
      );
    default:
      return false;
  }
}
