import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { maybeText, recordingFetch, responseFor, whitespace, word } from "./fixtures/ttsPreservationHelpers";
import { createOpenRouterTts } from "./openRouterTts";
import { selectTts } from "./selectTts";

describe("selectTts without a usable key", () => {
  it("returns the stub and makes no fetch call whatever the other settings are", async () => {
    await fc.assert(
      fc.asyncProperty(
        whitespace,
        maybeText,
        maybeText,
        maybeText,
        async (key, model, voice, format) => {
          const { fetchImpl, calls } = recordingFetch(() => responseFor(Buffer.from([1]), "x/y"));
          const env = { OPENROUTER_API_KEY: key, TTS_MODEL: model, TTS_VOICE: voice };

          const audio = await selectTts(
            { ...env, TTS_FORMAT: format },
            { fetch: fetchImpl },
          ).synthesize("سلام");

          expect(audio.mimeType).toBe("audio/wav");
          expect(calls).toEqual([]);
        },
      ),
    );
  });

  it("ignores an invalid TTS_FORMAT when the key is absent", async () => {
    const { fetchImpl, calls } = recordingFetch(() => responseFor(Buffer.from([1]), undefined));

    const audio = await selectTts({ TTS_FORMAT: "wav" }, { fetch: fetchImpl }).synthesize("x");

    expect(audio.mimeType).toBe("audio/wav");
    expect(calls).toEqual([]);
  });
});

describe("selectTts with a key but no model", () => {
  it("throws the model error whatever the voice and format are", () => {
    fc.assert(
      fc.property(whitespace, maybeText, maybeText, (model, voice, format) => {
        const env = { OPENROUTER_API_KEY: "sk-test", TTS_MODEL: model, TTS_VOICE: voice };

        expect(() => selectTts({ ...env, TTS_FORMAT: format })).toThrow(
          "TTS_MODEL must be set when OPENROUTER_API_KEY is set",
        );
      }),
    );
  });
});

describe("createOpenRouterTts request shape", () => {
  it("posts model, input, voice and mp3 format with a bearer header", async () => {
    const { fetchImpl, calls } = recordingFetch(() => responseFor(Buffer.from([1]), "audio/mpeg"));
    const tts = createOpenRouterTts({
      apiKey: "sk-test",
      model: "m/x",
      voice: "v1",
      fetch: fetchImpl,
    });

    await tts.synthesize("سلام");

    expect(calls[0]?.url).toBe("https://openrouter.ai/api/v1/audio/speech");
    expect(calls[0]?.headers.authorization).toBe("Bearer sk-test");
    expect(calls[0]?.body).toEqual({
      model: "m/x",
      input: "سلام",
      voice: "v1",
      response_format: "mp3",
    });
  });

  it("throws the status and provider message on a non-OK response", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 400, max: 599 }), word, async (status, message) => {
        const body = JSON.stringify({ error: { message } });
        const { fetchImpl } = recordingFetch(() => new Response(body, { status }));
        const tts = createOpenRouterTts({ apiKey: "k", model: "m", voice: "v1", fetch: fetchImpl });

        await expect(tts.synthesize("x")).rejects.toThrow(
          `OpenRouter speech failed (${status}): ${message}`,
        );
      }),
    );
  });
});
