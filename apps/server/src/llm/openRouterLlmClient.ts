import type { LlmClient, LlmRequest, LlmResponse } from "../orchestrator";

export type OpenRouterConfig = {
  apiKey: string;
  model: string;
  fetch?: typeof fetch;
  baseUrl?: string;
};

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

function toChatRequest(model: string, request: LlmRequest) {
  return {
    model,
    messages: [
      { role: "system", content: request.system },
      ...request.messages.map((message) => ({ role: message.role, content: message.content })),
    ],
    tools: request.tools.map((tool) => ({
      type: "function",
      function: { name: tool.name, description: tool.description, parameters: tool.inputSchema },
    })),
  };
}

export function createOpenRouterLlmClient({
  apiKey,
  model,
  fetch: fetchImpl = fetch,
  baseUrl = DEFAULT_BASE_URL,
}: OpenRouterConfig): LlmClient {
  return {
    async complete(request): Promise<LlmResponse> {
      await fetchImpl(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify(toChatRequest(model, request)),
      });
      return { content: [], stopReason: "end_turn" };
    },
  };
}
