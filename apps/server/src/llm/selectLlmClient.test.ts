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
  const fetchImpl: typeof fetch = async (input) => {
    urls.push(String(input));
    return new Response(
      JSON.stringify({ choices: [{ message: { content: "from the network" } }] }),
    );
  };
  return { fetchImpl, urls };
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
});
