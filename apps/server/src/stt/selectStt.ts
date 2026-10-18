import type { Env, LlmClientOptions } from "../llm/selectLlmClient";
import { createOpenRouterStt } from "./openRouterStt";
import { createStubStt } from "./stubStt";
import type { Stt } from "./stt";

export function selectStt(env: Env, options: LlmClientOptions = {}): Stt {
  const apiKey = env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return createStubStt();
  const model = env.STT_MODEL?.trim();
  if (!model) throw new Error("STT_MODEL must be set when OPENROUTER_API_KEY is set");
  return createOpenRouterStt({ apiKey, model, fetch: options.fetch });
}
