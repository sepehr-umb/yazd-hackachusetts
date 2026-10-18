import type { RequestResult } from "@mahmood/contracts";
import { describeFailure } from "@mahmood/strings";

export function spokenText(result: RequestResult): string {
  switch (result.status) {
    case "succeeded":
      return result.reply;
    case "clarification":
      return result.question;
    case "failed":
      return "message" in result.failure ? result.failure.message : describeFailure(result.failure);
  }
}
