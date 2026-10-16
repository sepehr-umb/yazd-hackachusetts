import type { AgentName } from "./events";
import type { ToolName } from "./tools";

export type SubAgentName = Exclude<AgentName, "orchestrator">;

export type TypedRequest = { text: string };

export type RequestFailure =
  | { reason: "tool_failed"; tool: ToolName; error: string }
  | { reason: "invalid_tool_call"; tool: string }
  | { reason: "too_many_steps" }
  | { reason: "unroutable" }
  | { reason: "llm_error"; message: string };

export type RequestResult =
  | { status: "succeeded"; agent: SubAgentName; reply: string }
  | { status: "clarification"; agent: "clarifier"; question: string }
  | { status: "failed"; agent?: SubAgentName; failure: RequestFailure };
