import type { RequestResult } from "@mahmood/contracts";
import { describeFailure } from "@mahmood/strings";
import type { EventDescription } from "../activity/describeEvent";

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
