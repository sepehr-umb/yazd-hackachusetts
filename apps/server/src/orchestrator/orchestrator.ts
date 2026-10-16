import type { EventBus } from "./eventBus";
import type { LlmClient } from "./llmClient";
import { LlmCallError, withLlmCallErrors } from "./llmCallError";
import type { OrchestratorResult, SubAgentName } from "./result";
import { routeRequest } from "./routeRequest";
import { runSubAgent } from "./runSubAgent";
import type { ToolSet } from "./tool";

export type OrchestratorDeps = { llm: LlmClient; tools: ToolSet; bus: EventBus };

export type Orchestrator = { handle(transcript: string): Promise<OrchestratorResult> };

function llmFailure(error: LlmCallError, agent?: SubAgentName): OrchestratorResult {
  const failure = { reason: "llm_error", message: error.message } as const;
  return agent ? { status: "failed", agent, failure } : { status: "failed", failure };
}

export function createOrchestrator(deps: OrchestratorDeps): Orchestrator {
  const llm = withLlmCallErrors(deps.llm);

  return {
    async handle(transcript) {
      deps.bus.emit({ type: "state", state: "thinking" });
      deps.bus.emit({ type: "agent", agent: "orchestrator" });

      let activeAgent: SubAgentName | undefined;
      let result: OrchestratorResult;
      try {
        activeAgent = await routeRequest(llm, transcript);
        if (activeAgent) {
          deps.bus.emit({ type: "agent", agent: activeAgent });
          result = await runSubAgent({ ...deps, llm }, activeAgent, transcript);
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
