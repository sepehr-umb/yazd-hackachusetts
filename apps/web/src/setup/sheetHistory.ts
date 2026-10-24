export type HistoryLike = {
  push(): void;
  back(): void;
  onPop(listener: () => void): () => void;
};

export const noHistory: HistoryLike = { push() {}, back() {}, onPop: () => () => {} };

export type SheetHistory = { opened(): void; closed(): void; stop(): void };

export function trackSheetHistory(history: HistoryLike, onBack: () => void): SheetHistory {
  let owned = false;
  let ignoredPops = 0;
  const stop = history.onPop(() => {
    if (ignoredPops > 0) {
      ignoredPops -= 1;
      return;
    }
    if (!owned) return;
    owned = false;
    onBack();
  });
  return {
    opened() {
      if (owned) return;
      owned = true;
      history.push();
    },
    closed() {
      if (!owned) return;
      owned = false;
      ignoredPops += 1;
      history.back();
    },
    stop,
  };
}
