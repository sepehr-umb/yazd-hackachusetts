import { isLanguageCode } from "@mahmood/contracts";
import type { Clock } from "../clock/clock";
import type { Orchestrator, OrchestratorResult } from "../orchestrator";
import { spokenText } from "../speech/spokenText";
import { createPendingQuestion } from "./pendingQuestion";

export type Conversation = {
  handle(text: string, language?: string): Promise<OrchestratorResult>;
};

export function createConversation(deps: {
  orchestrator: Orchestrator;
  clock: Clock;
}): Conversation {
  const pending = createPendingQuestion({ clock: deps.clock });

  return {
    async handle(text, language) {
      const history = pending.consume();
      let asked = false;
      const result = await deps.orchestrator.handle(text, {
        history,
        language: isLanguageCode(language) ? language : undefined,
        onQuestion: () => {
          asked = true;
        },
      });
      if (asked && result.status !== "failed") {
        pending.set({
          request: history ? `${history.request} ${text}` : text,
          question: spokenText(result),
        });
      }
      return result;
    },
  };
}
