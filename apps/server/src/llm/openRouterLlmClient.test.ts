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

  it("omits the tools field when the request has no tools", async () => {
    const { client, calls } = clientWith({ body: textCompletion("Hello") });

    await client.complete({
      system: "Translate.",
      messages: [{ role: "user", content: "سلام" }],
      tools: [],
    });

    expect(calls[0]?.body).toEqual({
      model: "test/model",
      messages: [
        { role: "system", content: "Translate." },
        { role: "user", content: "سلام" },
      ],
    });
  });

  it("replays assistant tool use as tool_calls and tool results as tool messages", async () => {
    const { client, calls } = clientWith({ body: textCompletion("done") });

    await client.complete({
      system: "s",
      tools: [],
      messages: [
        { role: "user", content: "call mom" },
        {
          role: "assistant",
          content: [
            { type: "text", text: "Calling" },
            { type: "tool_use", id: "call_1", name: "call_contact", input: { contact: "مامان" } },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              toolUseId: "call_1",
              content: '{"contact":"فاطمه"}',
              isError: false,
            },
            { type: "tool_result", toolUseId: "call_2", content: "no network", isError: true },
          ],
        },
      ],
    });

    expect(calls[0]?.body.messages).toEqual([
      { role: "system", content: "s" },
      { role: "user", content: "call mom" },
      {
        role: "assistant",
        content: "Calling",
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name: "call_contact", arguments: '{"contact":"مامان"}' },
          },
        ],
      },
      { role: "tool", tool_call_id: "call_1", content: '{"contact":"فاطمه"}' },
      { role: "tool", tool_call_id: "call_2", content: "Error: no network" },
    ]);
  });

  it("maps a text reply to a text block that ends the turn", async () => {
    const { client } = clientWith({ body: textCompletion("دارم به مامان زنگ می‌زنم") });

    const response = await client.complete(weatherRequest);

    expect(response).toEqual({
      stopReason: "end_turn",
      content: [{ type: "text", text: "دارم به مامان زنگ می‌زنم" }],
    });
  });

  it("maps tool calls to tool_use blocks with parsed input", async () => {
    const { client } = clientWith({
      body: {
        choices: [
          {
            finish_reason: "tool_calls",
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_1",
                  type: "function",
                  function: { name: "call_contact", arguments: '{"contact":"مامان"}' },
                },
                {
                  id: "call_2",
                  type: "function",
                  function: { name: "set_light", arguments: '{"room":"hall","on":true}' },
                },
              ],
            },
          },
        ],
      },
    });

    const response = await client.complete(weatherRequest);

    expect(response).toEqual({
      stopReason: "tool_use",
      content: [
        { type: "tool_use", id: "call_1", name: "call_contact", input: { contact: "مامان" } },
        { type: "tool_use", id: "call_2", name: "set_light", input: { room: "hall", on: true } },
      ],
    });
  });

  it("throws with the status and OpenRouter's message when the request is rejected", async () => {
    const { client } = clientWith({
      status: 401,
      body: { error: { code: 401, message: "No auth credentials found" } },
    });

    await expect(client.complete(weatherRequest)).rejects.toThrow(
      "OpenRouter request failed (401): No auth credentials found",
    );
  });

  it("throws when the model returns tool arguments that are not JSON", async () => {
    const { client } = clientWith({
      body: {
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                { id: "call_1", function: { name: "call_contact", arguments: "{contact:" } },
              ],
            },
          },
        ],
      },
    });

    await expect(client.complete(weatherRequest)).rejects.toThrow(
      "OpenRouter returned invalid arguments for call_contact",
    );
  });

  it.each([[{}], [{ choices: [] }]])(
    "throws when the response %j holds no completion",
    async (body) => {
      const { client } = clientWith({ body });

      await expect(client.complete(weatherRequest)).rejects.toThrow(
        "OpenRouter returned no completion",
      );
    },
  );
});
