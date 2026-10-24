import type { Clock } from "../clock/clock";
import type { ConversationHistory } from "../orchestrator";

export const PENDING_TTL_MS = 90_000;

export type PendingQuestion = {
  set(pending: ConversationHistory): void;
  consume(): ConversationHistory | undefined;
  clear(): void;
};

export function createPendingQuestion({ clock }: { clock: Clock }): PendingQuestion {
  let slot: { pending: ConversationHistory; at: number } | undefined;

  return {
    set(pending) {
      slot = { pending, at: clock.now().getTime() };
    },
    consume() {
      const current = slot;
      slot = undefined;
      if (!current) return undefined;
      return clock.now().getTime() - current.at <= PENDING_TTL_MS ? current.pending : undefined;
    },
    clear() {
      slot = undefined;
    },
  };
}
