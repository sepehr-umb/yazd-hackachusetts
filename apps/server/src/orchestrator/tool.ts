import type { ToolInputs, ToolName, ToolResult } from "@mahmood/contracts";

export interface Tool<N extends ToolName = ToolName> {
  readonly name: N;
  execute(input: ToolInputs[N]): Promise<ToolResult>;
}

export type ToolSet = { [N in ToolName]: Tool<N> };
