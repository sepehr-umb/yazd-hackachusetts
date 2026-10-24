import { conversationSeed } from "./conversationSeed";
import type { ConversationHistory } from "./conversationSeed";
import type { EventBus } from "./eventBus";
import type { LlmClient } from "./llmClient";
import { LlmCallError, withLlmCallErrors } from "./llmCallError";
import type { OrchestratorResult, SubAgentName } from "./result";
import { routeRequest } from "./routeRequest";
import { runSubAgent } from "./runSubAgent";
import type { ToolSet } from "./tool";

export type OrchestratorDeps = { llm: LlmClient; tools: ToolSet; bus: EventBus };

export type HandleOptions = {
  history?: ConversationHistory;
  language?: string;
  onQuestion?: () => void;
};

export type Orchestrator = {
  handle(transcript: string, options?: HandleOptions): Promise<OrchestratorResult>;
};

function llmFailure(error: LlmCallError, agent?: SubAgentName): OrchestratorResult {
  const failure = { reason: "llm_error", message: error.message } as const;
  return agent ? { status: "failed", agent, failure } : { status: "failed", failure };
}

export function createOrchestrator(deps: OrchestratorDeps): Orchestrator {
  const llm = withLlmCallErrors(deps.llm);

  return {
    async handle(transcript, options = {}) {
      const seed = options.history ? conversationSeed(transcript, options.history) : transcript;
      deps.bus.emit({ type: "state", state: "thinking" });
      deps.bus.emit({ type: "agent", agent: "orchestrator" });

      let activeAgent: SubAgentName | undefined;
      let result: OrchestratorResult;
      try {
        activeAgent = await routeRequest(llm, seed);
        if (activeAgent) {
          deps.bus.emit({ type: "agent", agent: activeAgent });
          result = await runSubAgent({ ...deps, llm }, activeAgent, seed, {
            language: options.language,
            onQuestion: options.onQuestion,
          });
        } else {
          result = { status: "failed", failure: { reason: "unroutable" } };
        }
      } catch (error) {
        if (!(error instanceof LlmCallError)) throw error;
        result = llmFailure(error, activeAgent);
      }

      deps.bus.emit({ type: "state", state: result.status === "failed" ? "error" : "speaking" });
      return result;
    },
  };
}
