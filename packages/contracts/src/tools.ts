export const toolNames = [
  "call_contact",
  "send_message",
  "set_light",
  "media_control",
  "ask_for_clarification",
] as const;

export const mediaActions = [
  "play",
  "pause",
  "stop",
  "next",
  "previous",
  "volume_up",
  "volume_down",
] as const;

export type ToolName = (typeof toolNames)[number];

export type MediaAction = (typeof mediaActions)[number];

export type ToolInputs = {
  call_contact: { contact: string };
  send_message: { contact: string; text: string };
  set_light: { room: string; on: boolean; brightness?: number };
  media_control: { action: MediaAction; query?: string };
  ask_for_clarification: { question: string };
};

export type ToolResult =
  { ok: true; output?: Record<string, unknown> } | { ok: false; error: string };
