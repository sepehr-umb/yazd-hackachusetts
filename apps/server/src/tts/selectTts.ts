import type { Env, LlmClientOptions } from "../llm/selectLlmClient";
import { createOpenRouterTts, type TtsFormat } from "./openRouterTts";
import { createStubTts } from "./stubTts";
import type { Tts } from "./tts";

function parseFormat(value: string | undefined): TtsFormat {
  const format = value?.trim();
  if (!format) return "mp3";
  if (format === "mp3" || format === "pcm") return format;
  throw new Error("TTS_FORMAT must be mp3 or pcm");
}

export function selectTts(env: Env, options: LlmClientOptions = {}): Tts {
  const apiKey = env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return createStubTts();
  const model = env.TTS_MODEL?.trim();
  if (!model) throw new Error("TTS_MODEL must be set when OPENROUTER_API_KEY is set");
  const voice = env.TTS_VOICE?.trim();
  if (!voice) throw new Error("TTS_VOICE must be set when OPENROUTER_API_KEY is set");
  const format = parseFormat(env.TTS_FORMAT);
  return createOpenRouterTts({ apiKey, model, voice, format, fetch: options.fetch });
}
