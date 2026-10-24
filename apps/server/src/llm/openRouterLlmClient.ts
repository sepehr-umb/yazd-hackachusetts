import type { LlmClient, LlmRequest, LlmResponse } from "../orchestrator";
import { OPENROUTER_BASE_URL, errorMessageOf } from "../openRouter/openRouterApi";
import { toChatMessages } from "./toChatMessages";
import type { LlmTextBlock, LlmToolUseBlock } from "../orchestrator/llmClient";

export type OpenRouterConfig = {
  apiKey: string;
  model: string;
  fetch?: typeof fetch;
  baseUrl?: string;
};

type ChatToolCall = { id: string; function: { name: string; arguments: string } };

type ChatCompletion = {
  choices?: Array<{ message: { content: string | null; tool_calls?: ChatToolCall[] } }>;
};

function parseArguments({ name, arguments: raw }: ChatToolCall["function"]) {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`OpenRouter returned invalid arguments for ${name}`);
  }
}

function fromChatCompletion(completion: ChatCompletion): LlmResponse {
  const message = completion.choices?.[0]?.message;
  if (!message) throw new Error("OpenRouter returned no completion");
  const toolCalls = message.tool_calls ?? [];
  const text: LlmTextBlock[] = message.content ? [{ type: "text", text: message.content }] : [];
  const toolUses: LlmToolUseBlock[] = toolCalls.map((call) => ({
    type: "tool_use",
    id: call.id,
    name: call.function.name,
    input: parseArguments(call.function),
  }));
  return {
    content: [...text, ...toolUses],
    stopReason: toolUses.length > 0 ? "tool_use" : "end_turn",
  };
}

function toChatRequest(model: string, request: LlmRequest) {
  const messages = toChatMessages(request.system, request.messages);
  if (request.tools.length === 0) return { model, messages };
  return {
    model,
    messages,
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
  baseUrl = OPENROUTER_BASE_URL,
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
