import { noHistory } from "./sheetHistory";
import type { HistoryLike } from "./sheetHistory";

export type SetupControl = {
  open(): void;
  onOpen(listener: () => void): () => void;
  history: HistoryLike;
};

export function createSetupControl(history: HistoryLike = noHistory): SetupControl {
  const listeners = new Set<() => void>();
  return {
    open: () => listeners.forEach((listener) => listener()),
    onOpen(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    history,
  };
}
