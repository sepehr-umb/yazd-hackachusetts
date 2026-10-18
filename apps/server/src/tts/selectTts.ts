import type { Env, LlmClientOptions } from "../llm/selectLlmClient";
import { createOpenRouterTts } from "./openRouterTts";
import { createStubTts } from "./stubTts";
import type { Tts } from "./tts";

export function selectTts(env: Env, options: LlmClientOptions = {}): Tts {
  const apiKey = env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return createStubTts();
  const model = env.TTS_MODEL?.trim();
  if (!model) throw new Error("TTS_MODEL must be set when OPENROUTER_API_KEY is set");
  return createOpenRouterTts({ apiKey, model, fetch: options.fetch });
}
