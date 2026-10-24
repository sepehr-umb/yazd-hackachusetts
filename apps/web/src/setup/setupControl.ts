export type SetupControl = { open(): void; onOpen(listener: () => void): () => void };

export function createSetupControl(): SetupControl {
  const listeners = new Set<() => void>();
  return {
    open: () => listeners.forEach((listener) => listener()),
    onOpen(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
