import { describe, expect, it } from "vitest";
import { selectTts } from "./selectTts";

function recordingFetch() {
  const urls: string[] = [];
  const bodies: Array<Record<string, unknown>> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    urls.push(String(input));
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response(Buffer.from([5]), { headers: { "content-type": "audio/mpeg" } });
  };
  return { fetchImpl, urls, bodies };
}

describe("selectTts", () => {
  it.each([[{}], [{ OPENROUTER_API_KEY: "" }], [{ OPENROUTER_API_KEY: "  " }]])(
    "returns the fixture audio without touching the network when env is %j",
    async (env) => {
      const { fetchImpl, urls } = recordingFetch();

      const audio = await selectTts(env, { fetch: fetchImpl }).synthesize("سلام");

      expect(audio.mimeType).toBe("audio/wav");
      expect(urls).toEqual([]);
    },
  );

  it("uses OpenRouter with the model from TTS_MODEL when the key is set", async () => {
    const { fetchImpl, urls, bodies } = recordingFetch();
    const tts = selectTts(
      { OPENROUTER_API_KEY: "sk-test", TTS_MODEL: "vendor/tts" },
      { fetch: fetchImpl },
    );

    expect((await tts.synthesize("سلام")).data).toEqual(Buffer.from([5]));
    expect(urls).toEqual(["https://openrouter.ai/api/v1/audio/speech"]);
    expect(bodies[0]?.model).toBe("vendor/tts");
  });

  it("refuses to start when the key is set but TTS_MODEL is not", () => {
    expect(() => selectTts({ OPENROUTER_API_KEY: "sk-test" })).toThrow(
      "TTS_MODEL must be set when OPENROUTER_API_KEY is set",
    );
  });
});
