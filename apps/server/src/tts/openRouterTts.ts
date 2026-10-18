import { OPENROUTER_BASE_URL, readErrorMessage } from "../openRouter/openRouterApi";
import type { Tts } from "./tts";

export type OpenRouterTtsConfig = {
  apiKey: string;
  model: string;
  voice?: string;
  fetch?: typeof fetch;
  baseUrl?: string;
};

const DEFAULT_VOICE = "alloy";
const RESPONSE_FORMAT = "mp3";
const DEFAULT_MIME_TYPE = "audio/mpeg";

export function createOpenRouterTts({
  apiKey,
  model,
  voice = DEFAULT_VOICE,
  fetch: fetchImpl = fetch,
  baseUrl = OPENROUTER_BASE_URL,
}: OpenRouterTtsConfig): Tts {
  return {
    async synthesize(text) {
      const response = await fetchImpl(`${baseUrl}/audio/speech`, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ model, input: text, voice, response_format: RESPONSE_FORMAT }),
      });
      if (!response.ok) {
        throw new Error(
          `OpenRouter speech failed (${response.status}): ${await readErrorMessage(response)}`,
        );
      }
      return {
        data: Buffer.from(await response.arrayBuffer()),
        mimeType: response.headers.get("content-type") ?? DEFAULT_MIME_TYPE,
      };
    },
  };
}
