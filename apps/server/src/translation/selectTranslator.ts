import { createOpenRouterLlmClient } from "../llm/openRouterLlmClient";
import type { Env, LlmClientOptions } from "../llm/selectLlmClient";
import { createLlmTranslator } from "./llmTranslator";
import { createStubTranslator } from "./stubTranslator";
import type { Translator } from "./translator";

export function selectTranslator(env: Env, options: LlmClientOptions = {}): Translator {
  const apiKey = env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return createStubTranslator();
  const model = env.LLM_MODEL?.trim();
  if (!model) throw new Error("LLM_MODEL must be set when OPENROUTER_API_KEY is set");
  return createLlmTranslator(createOpenRouterLlmClient({ apiKey, model, fetch: options.fetch }));
}
