import type { ToolName, ToolResult } from "@mahmood/contracts";
import type { Tool, ToolSet } from "./tool";

export async function executeTool(
  tools: ToolSet,
  name: ToolName,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const tool = tools[name] as Tool;
  try {
    return await tool.execute(input as never);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
