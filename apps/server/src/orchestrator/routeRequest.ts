import { agentDefinitions } from "./agents";
import type { LlmClient, LlmToolSchema } from "./llmClient";
import type { SubAgentName } from "./result";

const routableAgents = Object.keys(agentDefinitions) as SubAgentName[];

export const routeToolName = "route_to_agent";

const routeTool: LlmToolSchema = {
  name: routeToolName,
  description: "Choose the sub-agent that should handle the user's request.",
  inputSchema: {
    type: "object",
    properties: { agent: { type: "string", enum: routableAgents } },
    required: ["agent"],
  },
};

const routerSystem =
  "You route spoken requests from an elderly user, in whatever language they speak, to exactly one sub-agent by calling route_to_agent. comms: phone calls and messages. home: lights and other smart home devices. media: the TV, playing, pausing or finding shows and videos. clarifier: the request is ambiguous or missing a detail.";

export async function routeRequest(
  llm: LlmClient,
  transcript: string,
): Promise<SubAgentName | undefined> {
  const response = await llm.complete({
    system: routerSystem,
    messages: [{ role: "user", content: transcript }],
    tools: [routeTool],
  });
  const choice = response.content.find(
    (block) => block.type === "tool_use" && block.name === routeTool.name,
  );
  const agent = choice?.type === "tool_use" ? choice.input.agent : undefined;
  if (routableAgents.includes(agent as SubAgentName)) return agent as SubAgentName;
  return undefined;
}
