import { toolNames } from "@mahmood/contracts";
import type { RequestFailure, RequestResult } from "@mahmood/contracts";
import { describeFailure, friendlyApology } from "@mahmood/strings";
import type { LlmClient } from "../orchestrator";
import { spokenText } from "../speech/spokenText";
import { askModelForApology } from "./askModelForApology";

export type Replier = {
  reply(result: RequestResult, requestText: string): Promise<string>;
};

export type ReplierOptions = { llm?: LlmClient; timeoutMs?: number };

function isClean(text: string, failure: RequestFailure): boolean {
  const lowered = text.toLowerCase();
  const leaksTool = toolNames.some((name) => lowered.includes(name.toLowerCase()));
  return !leaksTool && !text.includes(describeFailure(failure));
}

async function replyToFailure(
  failure: RequestFailure,
  requestText: string,
  { llm, timeoutMs }: ReplierOptions,
): Promise<string> {
  const fallback = friendlyApology(failure, requestText);
  if (!llm) return fallback;
  const text = await askModelForApology(llm, requestText, timeoutMs);
  return text !== undefined && isClean(text, failure) ? text : fallback;
}

export function createReplier(options: ReplierOptions = {}): Replier {
  return {
    async reply(result, requestText) {
      if (result.status === "failed") return replyToFailure(result.failure, requestText, options);
      return spokenText(result);
    },
  };
}
