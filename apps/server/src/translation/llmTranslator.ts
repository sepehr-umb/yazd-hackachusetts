import type { LlmClient } from "../orchestrator";
import type { Translator } from "./translator";

const SYSTEM_PROMPT =
  "Translate the user's text into English. Output only the translation, with no quotes or commentary. If the text is already in English, return it unchanged.";

export function createLlmTranslator(llm: LlmClient): Translator {
  return {
    async toEnglish(text) {
      const response = await llm.complete({
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: text }],
        tools: [],
      });
      const block = response.content.find((item) => item.type === "text");
      const english = block?.type === "text" ? block.text.trim() : "";
      if (english === "") throw new Error("The model returned no translation");
      return english;
    },
  };
}
