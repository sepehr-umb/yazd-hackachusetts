import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { selectTts } from "./selectTts";

function recordingFetch() {
  const urls: string[] = [];
  const bodies: Array<Record<string, unknown>> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    urls.push(String(input));
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response(new Uint8Array(Buffer.from([5])), { headers: { "content-type": "audio/mpeg" } });
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
      { OPENROUTER_API_KEY: "sk-test", TTS_MODEL: "vendor/tts", TTS_VOICE: "v1" },
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

const baseEnv = { OPENROUTER_API_KEY: "sk-test", TTS_MODEL: "vendor/tts" };
const voiceError = "TTS_VOICE must be set when OPENROUTER_API_KEY is set";
const formatError = "TTS_FORMAT must be mp3 or pcm";
const whitespace = fc
  .array(fc.constantFrom(" ", "\t", "\n"), { maxLength: 6 })
  .map((chars) => chars.join(""));
const voiceId = fc.stringMatching(/^[A-Za-z0-9]{1,12}$/);

describe("selectTts voice", () => {
  it("refuses to start when the key and model are set but TTS_VOICE is not", () => {
    expect(() => selectTts(baseEnv)).toThrow(voiceError);
  });

  it("refuses to start for any whitespace-only TTS_VOICE", () => {
    fc.assert(
      fc.property(whitespace, (blank) => {
        expect(() => selectTts({ ...baseEnv, TTS_VOICE: blank })).toThrow(voiceError);
      }),
    );
  });

  it("sends the trimmed TTS_VOICE as the voice of the speech request", async () => {
    await fc.assert(
      fc.asyncProperty(whitespace, voiceId, whitespace, async (before, voice, after) => {
        const { fetchImpl, bodies } = recordingFetch();
        const env = { ...baseEnv, TTS_VOICE: `${before}${voice}${after}` };

        await selectTts(env, { fetch: fetchImpl }).synthesize("x");

        expect(bodies[0]?.voice).toBe(voice);
      }),
    );
  });
});

function pcmFetch(pcm: Buffer) {
  const bodies: Array<Record<string, unknown>> = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response(new Uint8Array(pcm), { headers: { "content-type": "audio/pcm" } });
  };
  return { fetchImpl, bodies };
}

describe("selectTts format", () => {
  const voiced = { ...baseEnv, TTS_VOICE: "v1" };

  it("sends the trimmed TTS_FORMAT as response_format and wraps pcm in a wav container", async () => {
    const pcm = Buffer.from([1, 2, 3, 4]);
    const { fetchImpl, bodies } = pcmFetch(pcm);

    const audio = await selectTts(
      { ...voiced, TTS_FORMAT: " pcm " },
      { fetch: fetchImpl },
    ).synthesize("x");

    expect(bodies[0]?.response_format).toBe("pcm");
    expect(audio.mimeType).toBe("audio/wav");
    expect(audio.data.length).toBe(44 + pcm.length);
    expect(audio.data.subarray(0, 4).toString("ascii")).toBe("RIFF");
  });

  it("refuses to start for any TTS_FORMAT that is not blank, mp3 or pcm after trimming", () => {
    const invalid = fc
      .oneof(fc.string(), fc.constantFrom("PCM", "Mp3", "wav"))
      .filter((value) => !["", "mp3", "pcm"].includes(value.trim()));

    fc.assert(
      fc.property(invalid, (format) => {
        expect(() => selectTts({ ...voiced, TTS_FORMAT: format })).toThrow(formatError);
      }),
    );
  });
});
