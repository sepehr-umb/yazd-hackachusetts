import { languageHeader } from "@mahmood/contracts";
import { strings } from "@mahmood/strings";
import { isLanguage } from "../profile/languages";
import type { Language } from "../profile/languages";
import { errorMessageOf } from "./errorMessageOf";

export type Transcription = { text: string; language: Language | undefined };
export type TranscribeClient = {
  transcribe(recording: Blob, language?: string): Promise<Transcription>;
};
export type TranscribeClientConfig = { fetch?: typeof fetch; url?: string };

export function createTranscribeClient({
  fetch: fetchImpl = (input, init) => fetch(input, init),
  url = "/transcribe",
}: TranscribeClientConfig = {}): TranscribeClient {
  return {
    async transcribe(recording, preferred) {
      const headers: Record<string, string> = { "content-type": recording.type };
      if (preferred !== undefined) headers[languageHeader] = preferred;
      const response = await fetchImpl(url, { method: "POST", headers, body: recording });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessageOf(payload));
      const { text, language } = (payload ?? {}) as { text?: unknown; language?: unknown };
      if (typeof text !== "string") throw new Error(strings.request.unexpectedResponse);
      return { text, language: isLanguage(language) ? language : undefined };
    },
  };
}
