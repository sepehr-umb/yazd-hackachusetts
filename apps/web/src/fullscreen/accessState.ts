import type { AssistantState } from "@mahmood/contracts";
import type { VoicePhase } from "../voice/voiceSession";

export type AccessState = "idle" | "listening" | "thinking" | "done" | "error";

export function accessState(
  phase: VoicePhase,
  stream: AssistantState,
  failed: boolean,
): AccessState {
  if (phase === "recording") return "listening";
  if (phase === "sending") return "thinking";
  if (phase === "starting") return "idle";
  if (stream === "thinking") return "thinking";
  if (stream === "speaking") return "done";
  if (stream === "error" || failed) return "error";
  return "idle";
}
