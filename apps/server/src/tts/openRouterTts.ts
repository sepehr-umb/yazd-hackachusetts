import { OPENROUTER_BASE_URL, readErrorMessage } from "../openRouter/openRouterApi";
import { pcmToWav } from "./pcmToWav";
import type { SpeechAudio } from "../speech/speechAudio";
import type { Tts } from "./tts";

export type TtsFormat = "mp3" | "pcm";

export type OpenRouterTtsConfig = {
  apiKey: string;
  model: string;
  voice: string;
  format?: TtsFormat;
  fetch?: typeof fetch;
  baseUrl?: string;
};

const DEFAULT_MIME_TYPE = "audio/mpeg";
const WAV_MIME_TYPE = "audio/wav";

function toSpeechAudio(format: TtsFormat, bytes: Buffer, contentType: string | null): SpeechAudio {
  if (format === "pcm") {
    return { data: pcmToWav(bytes), mimeType: WAV_MIME_TYPE };
  }
  return { data: bytes, mimeType: contentType ?? DEFAULT_MIME_TYPE };
}

export function createOpenRouterTts({
  apiKey,
  model,
  voice,
  format = "mp3",
  fetch: fetchImpl = fetch,
  baseUrl = OPENROUTER_BASE_URL,
}: OpenRouterTtsConfig): Tts {
  return {
    async synthesize(text) {
      const response = await fetchImpl(`${baseUrl}/audio/speech`, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ model, input: text, voice, response_format: format }),
      });
      if (!response.ok) {
        throw new Error(
          `OpenRouter speech failed (${response.status}): ${await readErrorMessage(response)}`,
        );
      }
      return toSpeechAudio(
        format,
        Buffer.from(await response.arrayBuffer()),
        response.headers.get("content-type"),
      );
    },
  };
}
