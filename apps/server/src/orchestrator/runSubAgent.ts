import { isToolName } from "@mahmood/contracts";
import type { EventBus } from "./eventBus";
import type { LlmClient, LlmMessage, LlmToolResultBlock } from "./llmClient";
import { agentDefinitions } from "./agents";
import { executeTool } from "./executeTool";
import { offersChoices } from "./offersChoices";
import { readQuestion } from "./readQuestion";
import type { SubAgentName, OrchestratorResult } from "./result";
import type { ToolSet } from "./tool";
import { withFallbackLanguage } from "./languageRule";
import { toolSchemas } from "./toolSchemas";
import { validateToolInput } from "./validateToolInput";

export const MAX_TOOL_TURNS = 5;

type SubAgentDeps = { llm: LlmClient; tools: ToolSet; bus: EventBus };

export type SubAgentOptions = { language?: string; onQuestion?: () => void };

export async function runSubAgent(
  deps: SubAgentDeps,
  agent: SubAgentName,
  seed: string | LlmMessage[],
  options: SubAgentOptions = {},
): Promise<OrchestratorResult> {
  const definition = agentDefinitions[agent];
  const schemas = definition.tools.map((name) => toolSchemas[name]);
  const system = withFallbackLanguage(definition.system, options.language);
  const messages: LlmMessage[] =
    typeof seed === "string" ? [{ role: "user", content: seed }] : [...seed];

  let toolTurns = 0;
  let lastOfferedChoices = false;

  for (;;) {
    const response = await deps.llm.complete({
      system,
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
      if (lastOfferedChoices) options.onQuestion?.();
      return { status: "succeeded", agent, reply };
    }

    toolTurns += 1;
    if (toolTurns > MAX_TOOL_TURNS) {
      return { status: "failed", agent, failure: { reason: "too_many_steps" } };
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
      if (!validateToolInput(toolSchemas[toolName].inputSchema, toolUse.input)) {
        return {
          status: "failed",
          agent,
          failure: { reason: "invalid_tool_call", tool: toolName },
        };
      }
      deps.bus.emit({ type: "tool_call", tool: toolName, status: "started" });
      const result = await executeTool(deps.tools, toolName, toolUse.input);
      const fail = (error: string): OrchestratorResult => {
        deps.bus.emit({ type: "tool_call", tool: toolName, status: "failed" });
        return {
          status: "failed",
          agent,
          failure: { reason: "tool_failed", tool: toolName, error },
        };
      };
      if (!result.ok) return fail(result.error);
      if (toolName === "ask_for_clarification") {
        const question = readQuestion(result.output);
        if (question === undefined) return fail("No question returned");
        deps.bus.emit({ type: "tool_call", tool: toolName, status: "succeeded" });
        options.onQuestion?.();
        return { status: "clarification", agent: "clarifier", question };
      }
      deps.bus.emit({ type: "tool_call", tool: toolName, status: "succeeded" });
      lastOfferedChoices = offersChoices(result.output);
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
