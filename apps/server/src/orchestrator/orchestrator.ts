import type { EventBus } from "./eventBus";
import type { LlmClient } from "./llmClient";
import type { OrchestratorResult } from "./result";
import { routeRequest } from "./routeRequest";
import { runSubAgent } from "./runSubAgent";
import type { ToolSet } from "./tool";

export type OrchestratorDeps = { llm: LlmClient; tools: ToolSet; bus: EventBus };

export type Orchestrator = { handle(transcript: string): Promise<OrchestratorResult> };

export function createOrchestrator(deps: OrchestratorDeps): Orchestrator {
  return {
    async handle(transcript) {
      const agent = await routeRequest(deps.llm, transcript);
      return runSubAgent(deps, agent, transcript);
    },
  };
}
