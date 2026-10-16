import type { LlmClient } from "./llmClient";

export class LlmCallError extends Error {}

export function withLlmCallErrors(llm: LlmClient): LlmClient {
  return {
    async complete(request) {
      try {
        return await llm.complete(request);
      } catch (error) {
        throw new LlmCallError(error instanceof Error ? error.message : String(error));
      }
    },
  };
}
