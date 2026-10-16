import type { RequestFailure, RequestResult } from "@mahmood/contracts";
import { strings } from "@mahmood/strings";
import type { EventDescription } from "../activity/describeEvent";

function describeFailure(failure: RequestFailure): string {
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

export function describeResult(result: RequestResult): EventDescription {
  switch (result.status) {
    case "succeeded":
      return { text: result.reply, tone: "neutral" };
    case "clarification":
      return { text: result.question, tone: "neutral" };
    case "failed":
      return { text: describeFailure(result.failure), tone: "error" };
  }
}
