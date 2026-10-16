import type { LlmClient, LlmToolSchema } from "./llmClient";
import type { SubAgentName } from "./result";

const routeTool: LlmToolSchema = {
  name: "route_to_agent",
  description: "Choose the sub-agent that should handle the user's request.",
  inputSchema: {
    type: "object",
    properties: { agent: { type: "string", enum: ["comms"] } },
    required: ["agent"],
  },
};

const routerSystem =
  "You route spoken requests from an elderly Farsi-speaking user to exactly one sub-agent by calling route_to_agent. comms: phone calls and messages.";

export async function routeRequest(llm: LlmClient, transcript: string): Promise<SubAgentName> {
  const response = await llm.complete({
    system: routerSystem,
    messages: [{ role: "user", content: transcript }],
    tools: [routeTool],
  });
  const choice = response.content.find(
    (block) => block.type === "tool_use" && block.name === routeTool.name,
  );
  if (choice?.type === "tool_use" && choice.input.agent === "comms") return "comms";
  throw new Error("Unroutable request");
}
