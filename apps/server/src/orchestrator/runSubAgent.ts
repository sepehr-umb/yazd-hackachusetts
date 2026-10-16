import { isToolName } from "@mahmood/contracts";
import type { EventBus } from "./eventBus";
import type { LlmClient, LlmMessage, LlmToolResultBlock } from "./llmClient";
import { agentDefinitions } from "./agents";
import { executeTool } from "./executeTool";
import type { SubAgentName, OrchestratorResult } from "./result";
import type { ToolSet } from "./tool";
import { toolSchemas } from "./toolSchemas";

type SubAgentDeps = { llm: LlmClient; tools: ToolSet; bus: EventBus };

export async function runSubAgent(
  deps: SubAgentDeps,
  agent: SubAgentName,
  transcript: string,
): Promise<OrchestratorResult> {
  const definition = agentDefinitions[agent];
  const schemas = definition.tools.map((name) => toolSchemas[name]);
  const messages: LlmMessage[] = [{ role: "user", content: transcript }];

  for (;;) {
    const response = await deps.llm.complete({
      system: definition.system,
      messages,
      tools: schemas,
    });
    const toolUses = response.content.flatMap((block) =>
      block.type === "tool_use" ? [block] : [],
    );
    if (toolUses.length === 0) {
      const reply = response.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("");
      return { status: "succeeded", agent, reply };
    }

    messages.push({ role: "assistant", content: response.content });
    const results: LlmToolResultBlock[] = [];
    for (const toolUse of toolUses) {
      if (!isToolName(toolUse.name) || !definition.tools.includes(toolUse.name)) {
        return {
          status: "failed",
          agent,
          failure: { reason: "invalid_tool_call", tool: toolUse.name },
        };
      }
      const toolName = toolUse.name;
      deps.bus.emit({ type: "tool_call", tool: toolName, status: "started" });
      const result = await executeTool(deps.tools, toolName, toolUse.input);
      if (!result.ok) {
        deps.bus.emit({ type: "tool_call", tool: toolName, status: "failed" });
        return {
          status: "failed",
          agent,
          failure: { reason: "tool_failed", tool: toolName, error: result.error },
        };
      }
      deps.bus.emit({ type: "tool_call", tool: toolName, status: "succeeded" });
      if (toolUse.name === "ask_for_clarification") {
        return {
          status: "clarification",
          agent: "clarifier",
          question: String(result.output?.question),
        };
      }
      results.push({
        type: "tool_result",
        toolUseId: toolUse.id,
        content: JSON.stringify(result.output ?? {}),
        isError: false,
      });
    }
    messages.push({ role: "user", content: results });
  }
}
