import type { Stt } from "./stt";

const FIXTURE_TEXT = "به مامان زنگ بزن";

export function createStubStt(): Stt {
  return { transcribe: async () => FIXTURE_TEXT };
}
