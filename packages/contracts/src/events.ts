export const assistantStates = ["idle", "listening", "thinking", "speaking", "error"] as const;
export const agentNames = ["orchestrator", "comms", "home", "media", "clarifier", "settings"] as const;
export const toolCallStatuses = ["started", "succeeded", "failed"] as const;

export const captionSpeakers = ["user", "assistant"] as const;

export type AssistantState = (typeof assistantStates)[number];

export type AgentName = (typeof agentNames)[number];

export type ToolCallStatus = (typeof toolCallStatuses)[number];

export type CaptionSpeaker = (typeof captionSpeakers)[number];

export type AssistantEvent =
  | { type: "state"; state: AssistantState }
  | { type: "agent"; agent: AgentName }
  | { type: "transcript"; text: string }
  | { type: "tool_call"; tool: string; status: ToolCallStatus }
  | { type: "speech"; audioUrl: string }
  | { type: "caption"; speaker: CaptionSpeaker; text: string; english: string };
