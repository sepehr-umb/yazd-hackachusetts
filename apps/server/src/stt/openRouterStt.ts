import { OPENROUTER_BASE_URL, readErrorMessage } from "../openRouter/openRouterApi";
import type { Stt } from "./stt";

export type OpenRouterSttConfig = {
  apiKey: string;
  model: string;
  fetch?: typeof fetch;
  baseUrl?: string;
};

const formatsByMimeType: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "audio/aac": "aac",
};

function formatOf(mimeType: string): string {
  const format = formatsByMimeType[mimeType.split(";")[0]?.trim().toLowerCase() ?? ""];
  if (!format) throw new Error(`Unsupported recording type: ${mimeType}`);
  return format;
}

export function createOpenRouterStt({
  apiKey,
  model,
  fetch: fetchImpl = fetch,
  baseUrl = OPENROUTER_BASE_URL,
}: OpenRouterSttConfig): Stt {
  return {
    async transcribe({ data, mimeType }) {
      const response = await fetchImpl(`${baseUrl}/audio/transcriptions`, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          input_audio: { data: data.toString("base64"), format: formatOf(mimeType) },
        }),
      });
      if (!response.ok) {
        throw new Error(
          `OpenRouter transcription failed (${response.status}): ${await readErrorMessage(response)}`,
        );
      }
      const payload = (await response.json()) as { text?: unknown };
      if (typeof payload.text !== "string") throw new Error("OpenRouter returned no transcription");
      return payload.text;
    },
  };
}
