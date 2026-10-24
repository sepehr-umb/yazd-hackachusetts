import type { RequestResult } from "@mahmood/contracts";
import type { EventBus } from "../orchestrator";
import type { Tts } from "../tts/tts";
import { spokenText } from "./spokenText";
import type { SpeechStore } from "./speechStore";

export type SpeakerDeps = { tts: Tts; store: SpeechStore; bus: EventBus };

export type Speaker = { speak(result: RequestResult): Promise<void> };

export function createSpeaker({ tts, store, bus }: SpeakerDeps): Speaker {
  return {
    async speak(result) {
      const audio = await tts.synthesize(spokenText(result));
      bus.emit({ type: "speech", audioUrl: `/speech/${store.put(audio)}` });
    },
  };
}
