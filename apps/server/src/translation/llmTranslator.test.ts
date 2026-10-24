import { describe, expect, it } from "vitest";
import type { LlmClient, LlmRequest } from "../orchestrator";
import { createLlmTranslator } from "./llmTranslator";

function recordingLlm(reply: string) {
  const requests: LlmRequest[] = [];
  const llm: LlmClient = {
    async complete(request) {
      requests.push(request);
      return { stopReason: "end_turn", content: [{ type: "text", text: reply }] };
    },
  };
  return { llm, requests };
}

describe("createLlmTranslator", () => {
  it("asks the model, with no tools, to translate the text and returns the trimmed reply", async () => {
    const { llm, requests } = recordingLlm("  Call mom\n");
    const translator = createLlmTranslator(llm);

    const english = await translator.toEnglish("به مامان زنگ بزن");

    expect(english).toBe("Call mom");
    expect(requests).toHaveLength(1);
    expect(requests[0]?.tools).toEqual([]);
    expect(requests[0]?.messages).toEqual([{ role: "user", content: "به مامان زنگ بزن" }]);
    expect(requests[0]?.system).toMatch(/translat\w+ .*English/i);
    expect(requests[0]?.system).toMatch(/only the translation/i);
    expect(requests[0]?.system).toMatch(/already in English.*unchanged/i);
  });

  it("throws when the model replies with no text", async () => {
    const llm: LlmClient = { complete: async () => ({ stopReason: "end_turn", content: [] }) };

    await expect(createLlmTranslator(llm).toEnglish("سلام")).rejects.toThrow(
      "The model returned no translation",
    );
  });
});
