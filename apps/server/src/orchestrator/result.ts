import type { AgentName, ToolName } from "@mahmood/contracts";

export type SubAgentName = Exclude<AgentName, "orchestrator">;

export type OrchestratorFailure = { reason: "tool_failed"; tool: ToolName; error: string };

export type OrchestratorResult =
  | { status: "succeeded"; agent: SubAgentName; reply: string }
  | { status: "failed"; agent: SubAgentName; failure: OrchestratorFailure };
