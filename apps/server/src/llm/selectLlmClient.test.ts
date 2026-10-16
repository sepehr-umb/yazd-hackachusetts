import { describe, expect, it } from "vitest";
import type { LlmRequest } from "../orchestrator";
import { routeToolName } from "../orchestrator";
import { selectLlmClient } from "./selectLlmClient";

const routeRequest: LlmRequest = {
  system: "route",
  messages: [{ role: "user", content: "به مامان زنگ بزن" }],
  tools: [{ name: routeToolName, description: "route", inputSchema: { type: "object" } }],
};

function recordingFetch() {
  const urls: string[] = [];
  const bodies: Array<Record<string, unknown>> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    urls.push(String(input));
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response(
      JSON.stringify({ choices: [{ message: { content: "from the network" } }] }),
    );
  };
  return { fetchImpl, urls, bodies };
}

describe("selectLlmClient", () => {
  it.each([[{}], [{ OPENROUTER_API_KEY: "" }], [{ OPENROUTER_API_KEY: "  " }]])(
    "replays recorded conversations without touching the network when env is %j",
    async (env) => {
      const { fetchImpl, urls } = recordingFetch();
      const llm = selectLlmClient(env, { fetch: fetchImpl });

      const response = await llm.complete(routeRequest);

      expect(response.content).toEqual([
        { type: "tool_use", id: "toolu_route_1", name: routeToolName, input: { agent: "comms" } },
      ]);
      expect(urls).toEqual([]);
    },
  );

  it("uses OpenRouter with the model from LLM_MODEL when the key is set", async () => {
    const { fetchImpl, urls, bodies } = recordingFetch();
    const llm = selectLlmClient(
      { OPENROUTER_API_KEY: "sk-test", LLM_MODEL: "anthropic/test-model" },
      { fetch: fetchImpl },
    );

    const response = await llm.complete(routeRequest);

    expect(response.content).toEqual([{ type: "text", text: "from the network" }]);
    expect(urls).toEqual(["https://openrouter.ai/api/v1/chat/completions"]);
    expect(bodies[0]?.model).toBe("anthropic/test-model");
  });

  it.each([
    [{ OPENROUTER_API_KEY: "sk-test" }],
    [{ OPENROUTER_API_KEY: "sk-test", LLM_MODEL: " " }],
  ])("refuses to start when the key is set but LLM_MODEL is not (%j)", (env) => {
    expect(() => selectLlmClient(env)).toThrow(
      "LLM_MODEL must be set when OPENROUTER_API_KEY is set",
    );
  });
});
