import type { Language } from "../profile/languages";

export type VoiceLike = { lang: string };
export type UtteranceLike = {
  text: string;
  lang: string;
  voice: unknown;
  onend?: ((event: never) => unknown) | null;
  onerror?: ((event: never) => unknown) | null;
};
export type SynthLike = {
  speak(utterance: UtteranceLike): void;
  cancel(): void;
  getVoices(): VoiceLike[];
};

export type Narrator = {
  say(text: string, language: Language, onEnd?: () => void): void;
  cancel(): void;
  canSpeak(language: Language): boolean;
};

export type NarratorDeps = {
  synth?: SynthLike;
  createUtterance?: (text: string) => UtteranceLike;
};

const speechTags: Record<Language, string> = { fa: "fa-IR", en: "en-US", es: "es-ES", it: "it-IT" };

function voiceFor(synth: SynthLike, language: Language) {
  const voices = synth.getVoices();
  if (voices.length === 0) return { found: true, voice: null };
  const voice = voices.find((candidate) => candidate.lang.toLowerCase().startsWith(language));
  return { found: voice !== undefined, voice: voice ?? null };
}

export function createNarrator({ synth, createUtterance }: NarratorDeps): Narrator {
  return {
    say(text, language, onEnd) {
      try {
        if (!synth || !createUtterance) return onEnd?.();
        const { found, voice } = voiceFor(synth, language);
        if (!found) return onEnd?.();
        const utterance = createUtterance(text);
        utterance.lang = speechTags[language];
        utterance.voice = voice;
        if (onEnd) {
          utterance.onend = onEnd;
          utterance.onerror = onEnd;
        }
        synth.speak(utterance);
      } catch {
        onEnd?.();
      }
    },
    canSpeak(language) {
      try {
        if (!synth || !createUtterance) return false;
        return voiceFor(synth, language).found;
      } catch {
        return false;
      }
    },
    cancel() {
      try {
        synth?.cancel();
      } catch {
        return;
      }
    },
  };
}
