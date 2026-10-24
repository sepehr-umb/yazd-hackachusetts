import type { LlmClient, LlmRequest, LlmResponse } from "../llmClient";

export type RecordedConversation = { transcript: string; responses: LlmResponse[] };

export type ReplayLlmClient = LlmClient & { requests: LlmRequest[] };

export function createReplayLlmClient(responses: LlmResponse[]): ReplayLlmClient {
  const requests: LlmRequest[] = [];
  return {
    requests,
    async complete(request) {
      const response = responses[requests.length];
      requests.push(request);
      if (!response) throw new Error(`No recorded response for LLM call #${requests.length}`);
      return response;
    },
  };
}
