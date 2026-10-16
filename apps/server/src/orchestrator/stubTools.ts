import { toolNames } from "@mahmood/contracts";
import type { ToolInputs, ToolName } from "@mahmood/contracts";
import type { Tool, ToolSet } from "./tool";

export type RecordedToolCall = { tool: ToolName; input: unknown };

export type StubToolOptions = { failures?: Partial<Record<ToolName, string>> };

export type StubTools = { tools: ToolSet; calls: RecordedToolCall[] };

function createStubTool<N extends ToolName>(
  name: N,
  calls: RecordedToolCall[],
  failure: string | undefined,
): Tool<N> {
  return {
    name,
    async execute(input: ToolInputs[N]) {
      calls.push({ tool: name, input });
      if (failure !== undefined) return { ok: false, error: failure };
      if (name === "ask_for_clarification") {
        const { question } = input as ToolInputs["ask_for_clarification"];
        return { ok: true, output: { question } };
      }
      return { ok: true };
    },
  };
}

export function createStubTools(options: StubToolOptions = {}): StubTools {
  const calls: RecordedToolCall[] = [];
  const entries = toolNames.map((name) => [
    name,
    createStubTool(name, calls, options.failures?.[name]),
  ]);
  return { tools: Object.fromEntries(entries) as ToolSet, calls };
}
