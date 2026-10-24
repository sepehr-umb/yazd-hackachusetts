import { strings } from "@mahmood/strings";
import { languages } from "../profile/languages";
import type { Language } from "../profile/languages";
import type { Narrator } from "./narrator";

export type Tour = { stop(): void };

const PAUSE_MS = 1000;

export function startTour(
  narrator: Narrator,
  show: (language: Language) => void,
): Tour | undefined {
  const speakable = languages.filter((language) => narrator.canSpeak(language));
  if (speakable.length === 0) return undefined;
  let index = 0;
  let active = true;
  let pause: ReturnType<typeof setTimeout> | undefined;
  const next = () => {
    if (!active) return;
    const language = speakable[index % speakable.length] ?? "en";
    index += 1;
    show(language);
    narrator.say(strings.setup[language].sayHello, language, () => {
      if (active) pause = setTimeout(next, PAUSE_MS);
    });
  };
  next();
  return {
    stop() {
      active = false;
      clearTimeout(pause);
    },
  };
}
