import type { RequestFailure } from "@mahmood/contracts";
import { strings } from "./strings";

export function describeFailure(failure: RequestFailure): string {
  switch (failure.reason) {
    case "tool_failed":
      return strings.failure.toolFailed(failure.tool, failure.error);
    case "invalid_tool_call":
      return strings.failure.invalidToolCall(failure.tool);
    case "too_many_steps":
      return strings.failure.tooManySteps;
    case "unroutable":
      return strings.failure.unroutable;
    case "llm_error":
      return strings.failure.llmError(failure.message);
  }
}
