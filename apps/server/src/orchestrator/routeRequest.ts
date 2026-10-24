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
  "You route spoken requests from an elderly user, in whatever language they speak, to exactly one sub-agent by calling route_to_agent. comms: phone calls and messages. home: lights and other smart home devices. media: the TV, playing, pausing or finding shows and videos. settings: changing how yazd itself behaves, namely speech rate, caption size, contrast, silence wait, or going back to normal settings. clock: questions about the current time or the current day of the week. clarifier: the request is ambiguous or missing a detail. If a request mixes a settings change or a time question with any other intent, or you cannot tell whether it is about yazd's own settings, choose clarifier.";

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
