import { describe, expect, it } from "vitest";
import type { LlmClient, LlmRequest } from "../orchestrator";
import { createLlmLanguageDetector } from "./llmLanguageDetector";

function answering(input: Record<string, unknown> | Error) {
  const requests: LlmRequest[] = [];
  const llm: LlmClient = {
    async complete(request) {
      requests.push(request);
      if (input instanceof Error) throw input;
      return {
        stopReason: "tool_use",
        content: [{ type: "tool_use", id: "t1", name: "detect_language", input }],
      };
    },
  };
  return { llm, requests };
}

describe("llm language detector", () => {
  it("asks once with a single detect_language tool limited to the four languages or unknown", async () => {
    const { llm, requests } = answering({ language: "it" });

    expect(await createLlmLanguageDetector(llm).detect("eccomi qua")).toBe("it");
    expect(requests).toHaveLength(1);
    expect(requests[0]?.messages).toEqual([{ role: "user", content: "eccomi qua" }]);
    expect(requests[0]?.tools.map((tool) => tool.name)).toEqual(["detect_language"]);
    expect(requests[0]?.tools[0]?.inputSchema).toMatchObject({
      type: "object",
      properties: { language: { type: "string", enum: ["fa", "en", "es", "it", "unknown"] } },
      required: ["language"],
    });
  });

  it.each([{ language: "unknown" }, { language: "de" }, {}])(
    "returns nothing for %j",
    async (input) => {
      expect(
        await createLlmLanguageDetector(answering(input).llm).detect("guten tag"),
      ).toBeUndefined();
    },
  );

  it("returns nothing when the model answers in text or the call fails", async () => {
    const texting: LlmClient = {
      complete: async () => ({ stopReason: "end_turn", content: [{ type: "text", text: "it" }] }),
    };

    expect(await createLlmLanguageDetector(texting).detect("eccomi")).toBeUndefined();
    expect(
      await createLlmLanguageDetector(answering(new Error("down")).llm).detect("eccomi"),
    ).toBeUndefined();
  });
});
