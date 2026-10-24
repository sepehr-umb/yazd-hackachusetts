import { routeToolName } from "../orchestrator";
import type { LlmClient, LlmRequest, LlmResponse } from "../orchestrator";
import type { RecordedConversation } from "../orchestrator/testing/replayLlmClient";

type SplitRequest = { request: string; answer?: string; assistantTurns: number };

function userText(message: LlmRequest["messages"][number] | undefined): string | undefined {
  return message?.role === "user" && typeof message.content === "string"
    ? message.content.trim()
    : undefined;
}

function splitRequest(request: LlmRequest): SplitRequest {
  const [first, second, third] = request.messages;
  const assistantTurns = request.messages.filter((message) => message.role === "assistant").length;
  const answer = second?.role === "assistant" ? userText(third) : undefined;
  return { request: userText(first) ?? "", answer, assistantTurns };
}

function stepOf(request: LlmRequest, split: SplitRequest): number {
  if (request.tools.some((tool) => tool.name === routeToolName)) return 0;
  const modelTurns = split.answer === undefined ? split.assistantTurns : split.assistantTurns - 1;
  return 1 + modelTurns;
}

export function createTranscriptReplayLlmClient(conversations: RecordedConversation[]): LlmClient {
  return {
    async complete(request): Promise<LlmResponse> {
      const split = splitRequest(request);
      const conversation = conversations.find(
        (candidate) => candidate.transcript === split.request && candidate.followUp === split.answer,
      );
      const response = conversation?.responses[stepOf(request, split)];
      if (!response) throw new Error(`No recorded response for "${split.answer ?? split.request}"`);
      return response;
    },
  };
}
