import type { EventBus } from "./eventBus";
import type { LlmClient, LlmMessage, LlmToolResultBlock, LlmToolSchema } from "./llmClient";
import { agentDefinitions } from "./agents";
import type { SubAgentName, OrchestratorResult } from "./result";
import type { ToolSet } from "./tool";
import { toolSchemas } from "./toolSchemas";

type SubAgentDeps = { llm: LlmClient; tools: ToolSet; bus: EventBus };

export async function runSubAgent(
  deps: SubAgentDeps,
  agent: SubAgentName,
  transcript: string,
): Promise<OrchestratorResult> {
  const definition = agentDefinitions[agent]!;
  const schemas = definition.tools.map((name) => toolSchemas[name] as LlmToolSchema);
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
      const tool = deps.tools[toolUse.name as keyof ToolSet] as {
        execute(input: unknown): Promise<{ ok: boolean; output?: Record<string, unknown> }>;
      };
      deps.bus.emit({ type: "tool_call", tool: toolUse.name, status: "started" });
      const result = await tool.execute(toolUse.input);
      deps.bus.emit({ type: "tool_call", tool: toolUse.name, status: "succeeded" });
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
