import type { EventBus } from "./eventBus";
import type { LlmClient } from "./llmClient";
import type { OrchestratorResult, SubAgentName } from "./result";
import { routeRequest } from "./routeRequest";
import { runSubAgent } from "./runSubAgent";
import type { ToolSet } from "./tool";

export type OrchestratorDeps = { llm: LlmClient; tools: ToolSet; bus: EventBus };

export type Orchestrator = { handle(transcript: string): Promise<OrchestratorResult> };

function dispatch(
  deps: OrchestratorDeps,
  agent: SubAgentName,
  transcript: string,
): Promise<OrchestratorResult> {
  deps.bus.emit({ type: "agent", agent });
  return runSubAgent(deps, agent, transcript);
}

export function createOrchestrator(deps: OrchestratorDeps): Orchestrator {
  return {
    async handle(transcript) {
      deps.bus.emit({ type: "state", state: "thinking" });
      deps.bus.emit({ type: "agent", agent: "orchestrator" });
      const agent = await routeRequest(deps.llm, transcript);
      const result: OrchestratorResult = agent
        ? await dispatch(deps, agent, transcript)
        : { status: "failed", failure: { reason: "unroutable" } };
      deps.bus.emit({ type: "state", state: result.status === "failed" ? "error" : "speaking" });
      return result;
    },
  };
}
