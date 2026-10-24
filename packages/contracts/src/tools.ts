import type { SettingName, SettingValue } from "./settings";

export const toolNames = [
  "call_contact",
  "send_message",
  "set_light",
  "media_control",
  "ask_for_clarification",
  "update_setting",
  "reset_settings",
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
  update_setting: { name: SettingName; value: SettingValue };
  reset_settings: Record<string, unknown>;
};

export type ToolResult =
  { ok: true; output?: Record<string, unknown> } | { ok: false; error: string };
