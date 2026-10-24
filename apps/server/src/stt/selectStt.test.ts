import { describe, expect, it } from "vitest";
import { selectStt } from "./selectStt";

const recording = { data: Buffer.from("v"), mimeType: "audio/webm" };

function recordingFetch() {
  const urls: string[] = [];
  const bodies: Array<Record<string, unknown>> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    urls.push(String(input));
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response(JSON.stringify({ text: "from the network" }));
  };
  return { fetchImpl, urls, bodies };
}

describe("selectStt", () => {
  it.each([[{}], [{ OPENROUTER_API_KEY: "" }], [{ OPENROUTER_API_KEY: "  " }]])(
    "returns fixture text without touching the network when env is %j",
    async (env) => {
      const { fetchImpl, urls } = recordingFetch();

      const text = await selectStt(env, { fetch: fetchImpl }).transcribe(recording);

      expect(text).toBe("به مامان زنگ بزن");
      expect(urls).toEqual([]);
    },
  );

  it("uses OpenRouter with the model from STT_MODEL when the key is set", async () => {
    const { fetchImpl, urls, bodies } = recordingFetch();
    const stt = selectStt(
      { OPENROUTER_API_KEY: "sk-test", STT_MODEL: "vendor/stt" },
      { fetch: fetchImpl },
    );

    expect(await stt.transcribe(recording)).toBe("from the network");
    expect(urls).toEqual(["https://openrouter.ai/api/v1/audio/transcriptions"]);
    expect(bodies[0]?.model).toBe("vendor/stt");
  });

  it("refuses to start when the key is set but STT_MODEL is not", () => {
    expect(() => selectStt({ OPENROUTER_API_KEY: "sk-test" })).toThrow(
      "STT_MODEL must be set when OPENROUTER_API_KEY is set",
    );
  });
});
