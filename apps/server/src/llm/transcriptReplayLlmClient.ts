import { routeToolName } from "../orchestrator";
import type { LlmClient, LlmRequest, LlmResponse } from "../orchestrator";
import type { RecordedConversation } from "../orchestrator/testing/replayLlmClient";

function transcriptOf(request: LlmRequest): string {
  const first = request.messages[0];
  return first?.role === "user" && typeof first.content === "string" ? first.content.trim() : "";
}

function stepOf(request: LlmRequest): number {
  if (request.tools.some((tool) => tool.name === routeToolName)) return 0;
  const assistantTurns = request.messages.filter((message) => message.role === "assistant").length;
  return 1 + assistantTurns;
}

export function createTranscriptReplayLlmClient(conversations: RecordedConversation[]): LlmClient {
  return {
    async complete(request): Promise<LlmResponse> {
      const transcript = transcriptOf(request);
      const conversation = conversations.find((candidate) => candidate.transcript === transcript);
      const response = conversation?.responses[stepOf(request)];
      if (!response) throw new Error(`No recorded response for "${transcript}"`);
      return response;
    },
  };
}
