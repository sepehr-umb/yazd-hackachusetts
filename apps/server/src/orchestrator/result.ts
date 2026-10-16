import type { AgentName, ToolName } from "@mahmood/contracts";

export type SubAgentName = Exclude<AgentName, "orchestrator">;

export type OrchestratorFailure =
  | { reason: "tool_failed"; tool: ToolName; error: string }
  | { reason: "invalid_tool_call"; tool: string };

export type OrchestratorResult =
  | { status: "succeeded"; agent: SubAgentName; reply: string }
  | { status: "clarification"; agent: "clarifier"; question: string }
  | { status: "failed"; agent: SubAgentName; failure: OrchestratorFailure };
