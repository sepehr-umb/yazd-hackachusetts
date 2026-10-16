import { describe, expect, it } from "vitest";
import type { LlmRequest } from "../orchestrator";
import { createOpenRouterLlmClient } from "./openRouterLlmClient";

type CapturedCall = { url: string; init: RequestInit; body: Record<string, unknown> };

function fakeFetch(reply: { status?: number; body: unknown }) {
  const calls: CapturedCall[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({
      url: String(input),
      init: init ?? {},
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });
    return new Response(JSON.stringify(reply.body), {
      status: reply.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { fetchImpl, calls };
}

function textCompletion(content: string) {
  return { choices: [{ message: { role: "assistant", content }, finish_reason: "stop" }] };
}

function clientWith(reply: { status?: number; body: unknown }) {
  const { fetchImpl, calls } = fakeFetch(reply);
  const client = createOpenRouterLlmClient({
    apiKey: "sk-test",
    model: "test/model",
    fetch: fetchImpl,
  });
  return { client, calls };
}

const weatherRequest: LlmRequest = {
  system: "You route requests.",
  messages: [{ role: "user", content: "به مامان زنگ بزن" }],
  tools: [
    {
      name: "route_to_agent",
      description: "Choose the sub-agent.",
      inputSchema: { type: "object", properties: { agent: { type: "string" } } },
    },
  ],
};

describe("createOpenRouterLlmClient", () => {
  it("posts an OpenAI-style chat completion with the configured model, key, system prompt and tools", async () => {
    const { client, calls } = clientWith({ body: textCompletion("ok") });

    await client.complete(weatherRequest);

    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call?.url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(call?.init.method).toBe("POST");
    expect(call?.init.headers).toMatchObject({
      authorization: "Bearer sk-test",
      "content-type": "application/json",
    });
    expect(call?.body).toEqual({
      model: "test/model",
      messages: [
        { role: "system", content: "You route requests." },
        { role: "user", content: "به مامان زنگ بزن" },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "route_to_agent",
            description: "Choose the sub-agent.",
            parameters: { type: "object", properties: { agent: { type: "string" } } },
          },
        },
      ],
    });
  });

  it("maps a text reply to a text block that ends the turn", async () => {
    const { client } = clientWith({ body: textCompletion("دارم به مامان زنگ می‌زنم") });

    const response = await client.complete(weatherRequest);

    expect(response).toEqual({
      stopReason: "end_turn",
      content: [{ type: "text", text: "دارم به مامان زنگ می‌زنم" }],
    });
  });
});
