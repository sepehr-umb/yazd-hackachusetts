import { describe, expect, it } from "vitest";
import { selectTranslator } from "./selectTranslator";

function recordingFetch() {
  const bodies: Array<Record<string, unknown>> = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response(JSON.stringify({ choices: [{ message: { content: "Hello" } }] }));
  };
  return { fetchImpl, bodies };
}

describe("selectTranslator", () => {
  it.each([[{}], [{ OPENROUTER_API_KEY: "" }], [{ OPENROUTER_API_KEY: "  " }]])(
    "returns the text unchanged without touching the network when env is %j",
    async (env) => {
      const { fetchImpl, bodies } = recordingFetch();

      const english = await selectTranslator(env, { fetch: fetchImpl }).toEnglish("سلام");

      expect(english).toBe("سلام");
      expect(bodies).toEqual([]);
    },
  );

  it("translates through OpenRouter with LLM_MODEL and no tools when the key is set", async () => {
    const { fetchImpl, bodies } = recordingFetch();
    const translator = selectTranslator(
      { OPENROUTER_API_KEY: "sk-test", LLM_MODEL: "anthropic/test-model" },
      { fetch: fetchImpl },
    );

    const english = await translator.toEnglish("سلام");

    expect(english).toBe("Hello");
    expect(bodies[0]?.model).toBe("anthropic/test-model");
    expect(bodies[0]).not.toHaveProperty("tools");
  });

  it("refuses to start when the key is set but LLM_MODEL is not", () => {
    expect(() => selectTranslator({ OPENROUTER_API_KEY: "sk-test" })).toThrow(
      "LLM_MODEL must be set when OPENROUTER_API_KEY is set",
    );
  });
});
