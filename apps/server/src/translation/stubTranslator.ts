import type { Translator } from "./translator";

export function createStubTranslator(): Translator {
  return { toEnglish: async (text) => text };
}
