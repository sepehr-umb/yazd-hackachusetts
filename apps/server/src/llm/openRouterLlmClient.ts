import type { LlmClient, LlmRequest, LlmResponse } from "../orchestrator";
import { toChatMessages } from "./toChatMessages";
import type { LlmTextBlock, LlmToolUseBlock } from "../orchestrator/llmClient";

export type OpenRouterConfig = {
  apiKey: string;
  model: string;
  fetch?: typeof fetch;
  baseUrl?: string;
};

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

type ChatToolCall = { id: string; function: { name: string; arguments: string } };

type ChatCompletion = {
  choices: Array<{ message: { content: string | null; tool_calls?: ChatToolCall[] } }>;
};

function fromChatCompletion(completion: ChatCompletion): LlmResponse {
  const message = completion.choices[0]?.message;
  const toolCalls = message?.tool_calls ?? [];
  const text: LlmTextBlock[] = message?.content ? [{ type: "text", text: message.content }] : [];
  const toolUses: LlmToolUseBlock[] = toolCalls.map((call) => ({
    type: "tool_use",
    id: call.id,
    name: call.function.name,
    input: JSON.parse(call.function.arguments) as Record<string, unknown>,
  }));
  return {
    content: [...text, ...toolUses],
    stopReason: toolUses.length > 0 ? "tool_use" : "end_turn",
  };
}

function errorMessageOf(payload: unknown): string {
  const message = (payload as { error?: { message?: unknown } } | null)?.error?.message;
  return typeof message === "string" ? message : JSON.stringify(payload);
}

function toChatRequest(model: string, request: LlmRequest) {
  return {
    model,
    messages: toChatMessages(request.system, request.messages),
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
      const httpResponse = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify(toChatRequest(model, request)),
      });
      const payload: unknown = await httpResponse.json();
      if (!httpResponse.ok) {
        throw new Error(
          `OpenRouter request failed (${httpResponse.status}): ${errorMessageOf(payload)}`,
        );
      }
      const completion = payload as ChatCompletion;
      return fromChatCompletion(completion);
    },
  };
}
