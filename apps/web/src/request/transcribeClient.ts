import { strings } from "@mahmood/strings";
import { isLanguage } from "../profile/languages";
import type { Language } from "../profile/languages";
import { errorMessageOf } from "./errorMessageOf";

export type Transcription = { text: string; language: Language | undefined };
export type TranscribeClient = { transcribe(recording: Blob): Promise<Transcription> };
export type TranscribeClientConfig = { fetch?: typeof fetch; url?: string };

export function createTranscribeClient({
  fetch: fetchImpl = (input, init) => fetch(input, init),
  url = "/transcribe",
}: TranscribeClientConfig = {}): TranscribeClient {
  return {
    async transcribe(recording) {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": recording.type },
        body: recording,
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessageOf(payload));
      const { text, language } = (payload ?? {}) as { text?: unknown; language?: unknown };
      if (typeof text !== "string") throw new Error(strings.request.unexpectedResponse);
      return { text, language: isLanguage(language) ? language : undefined };
    },
  };
}
