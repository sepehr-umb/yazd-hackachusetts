import type { LlmClient } from "../orchestrator";
import { replayConversations } from "./replayConversations";
import { createTranscriptReplayLlmClient } from "./transcriptReplayLlmClient";

export type Env = Record<string, string | undefined>;

export type LlmClientOptions = { fetch?: typeof fetch };

export function selectLlmClient(_env: Env, _options: LlmClientOptions = {}): LlmClient {
  return createTranscriptReplayLlmClient(replayConversations);
}
