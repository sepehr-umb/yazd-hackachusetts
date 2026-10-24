import type { RequestResult } from "@mahmood/contracts";

export type SpokenResult = Extract<RequestResult, { status: "succeeded" | "clarification" }>;

export function spokenText(result: SpokenResult): string {
  switch (result.status) {
    case "succeeded":
      return result.reply;
    case "clarification":
      return result.question;
  }
}
