import type { EventBus } from "../orchestrator";
import type { Tts } from "../tts/tts";
import type { SpeechStore } from "./speechStore";

export type SpeakerDeps = { tts: Tts; store: SpeechStore; bus: EventBus };

export type Speaker = { speak(text: string): Promise<void> };

export function createSpeaker({ tts, store, bus }: SpeakerDeps): Speaker {
  return {
    async speak(text) {
      const audio = await tts.synthesize(text);
      bus.emit({ type: "speech", audioUrl: `/speech/${store.put(audio)}` });
    },
  };
}
