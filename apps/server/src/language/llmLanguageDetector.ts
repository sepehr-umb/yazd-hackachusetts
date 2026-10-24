import type { LlmClient } from "../orchestrator";
import { languages } from "./detectLanguage";
import type { Language } from "./detectLanguage";

export type LanguageDetector = { detect(text: string): Promise<Language | undefined> };

const TOOL = "detect_language";
const SYSTEM_PROMPT =
  "Identify the language the user's text is written in. Call detect_language once. Use unknown when the language is none of the choices or cannot be told.";

const tool = {
  name: TOOL,
  description: "Report the language of the user's text.",
  inputSchema: {
    type: "object",
    properties: { language: { type: "string", enum: [...languages, "unknown"] } },
    required: ["language"],
  },
};

export function createLlmLanguageDetector(llm: LlmClient): LanguageDetector {
  return {
    async detect(text) {
      try {
        const response = await llm.complete({
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: text }],
          tools: [tool],
        });
        const call = response.content.find(
          (block) => block.type === "tool_use" && block.name === TOOL,
        );
        const answer = call?.type === "tool_use" ? call.input.language : undefined;
        return languages.find((language) => language === answer);
      } catch {
        return undefined;
      }
    },
  };
}
