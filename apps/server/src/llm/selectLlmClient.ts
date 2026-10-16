import type { LlmClient } from "../orchestrator";
import { createOpenRouterLlmClient } from "./openRouterLlmClient";
import { replayConversations } from "./replayConversations";
import { createTranscriptReplayLlmClient } from "./transcriptReplayLlmClient";

export type Env = Record<string, string | undefined>;

export type LlmClientOptions = { fetch?: typeof fetch };

export function selectLlmClient(env: Env, options: LlmClientOptions = {}): LlmClient {
  const apiKey = env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return createTranscriptReplayLlmClient(replayConversations);
  const model = env.LLM_MODEL?.trim();
  if (!model) throw new Error("LLM_MODEL must be set when OPENROUTER_API_KEY is set");
  return createOpenRouterLlmClient({ apiKey, model, fetch: options.fetch });
}
