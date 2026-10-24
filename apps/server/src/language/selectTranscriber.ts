import { createOpenRouterLlmClient } from "../llm/openRouterLlmClient";
import type { Env, LlmClientOptions } from "../llm/selectLlmClient";
import type { Stt } from "../stt/stt";
import { createLlmLanguageDetector } from "./llmLanguageDetector";
import { createStubTranscriber, createTranscriber } from "./transcriber";
import type { Transcriber } from "./transcriber";

export function selectTranscriber(env: Env, stt: Stt, options: LlmClientOptions = {}): Transcriber {
  const apiKey = env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return createStubTranscriber();
  const model = env.LLM_MODEL?.trim();
  if (!model) throw new Error("LLM_MODEL must be set when OPENROUTER_API_KEY is set");
  const llm = createOpenRouterLlmClient({ apiKey, model, fetch: options.fetch });
  return createTranscriber(stt, createLlmLanguageDetector(llm));
}
