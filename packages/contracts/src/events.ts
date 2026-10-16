export type AssistantState = "idle" | "listening" | "thinking" | "speaking" | "error";

export type AgentName = "orchestrator" | "comms" | "home" | "media" | "clarifier";

export type ToolCallStatus = "started" | "succeeded" | "failed";

export type AssistantEvent =
  | { type: "state"; state: AssistantState }
  | { type: "agent"; agent: AgentName }
  | { type: "transcript"; text: string }
  | { type: "tool_call"; tool: string; status: ToolCallStatus }
  | { type: "speech"; audioUrl: string };
