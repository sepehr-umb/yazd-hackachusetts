import type { AssistantState } from "@mahmood/contracts";
import type { VoicePhase } from "../voice/voiceSession";

export function companionState(phase: VoicePhase, streamState: AssistantState): AssistantState {
  switch (phase) {
    case "starting":
    case "recording":
      return "listening";
    case "sending":
      return "thinking";
    case "idle":
      return streamState;
  }
}
