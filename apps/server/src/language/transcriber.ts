import type { SpeechAudio } from "../speech/speechAudio";
import type { Stt } from "../stt/stt";
import { detectLanguage } from "./detectLanguage";
import type { Language } from "./detectLanguage";
import type { LanguageDetector } from "./llmLanguageDetector";

export type Transcription = { text: string; language: Language | undefined };
export type Transcriber = {
  transcribe(recording: SpeechAudio, options?: { language?: string }): Promise<Transcription>;
};

export function createTranscriber(stt: Stt, detector: LanguageDetector): Transcriber {
  return {
    async transcribe(recording, options) {
      const text = (await stt.transcribe(recording, options)).trim();
      if (text === "") return { text, language: undefined };
      return { text, language: detectLanguage(text) ?? (await detector.detect(text)) };
    },
  };
}

export function createStubTranscriber(): Transcriber {
  return { transcribe: async () => ({ text: "", language: undefined }) };
}
