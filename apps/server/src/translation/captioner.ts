import type { CaptionSpeaker } from "@mahmood/contracts";
import { strings } from "@mahmood/strings";
import type { EventBus } from "../orchestrator";
import type { Translator } from "./translator";

export type CaptionerDeps = { translator: Translator; bus: EventBus };

export type Captioner = { announce(speaker: CaptionSpeaker, text: string): Promise<void> };

export function createCaptioner({ translator, bus }: CaptionerDeps): Captioner {
  return {
    async announce(speaker, text) {
      let english: string;
      try {
        english = await translator.toEnglish(text);
      } catch {
        english = strings.captions.translationUnavailable;
      }
      bus.emit({ type: "caption", speaker, text, english });
    },
  };
}
