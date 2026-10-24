import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  contentType,
  modelId,
  mp3Setting,
  providerBytes,
  recordingFetch,
  responseFor,
  word,
} from "./fixtures/ttsPreservationHelpers";
import { createOpenRouterTts } from "./openRouterTts";
import { selectTts } from "./selectTts";

describe("mp3 and default format passthrough", () => {
  it("sends mp3 and returns the provider bytes and content type through selectTts", async () => {
    await fc.assert(
      fc.asyncProperty(
        modelId,
        word,
        mp3Setting,
        providerBytes,
        contentType,
        async (model, voice, format, bytes, type) => {
          const { fetchImpl, calls } = recordingFetch(() => responseFor(bytes, type));
          const env = { OPENROUTER_API_KEY: "sk-test", TTS_MODEL: model, TTS_VOICE: voice };

          const audio = await selectTts(
            { ...env, TTS_FORMAT: format },
            { fetch: fetchImpl },
          ).synthesize("x");

          expect(calls[0]?.body.response_format).toBe("mp3");
          expect(audio.data).toEqual(bytes);
          expect(audio.mimeType).toBe(type ?? "audio/mpeg");
        },
      ),
    );
  });

  it("returns the provider bytes and content type from createOpenRouterTts without a format", async () => {
    await fc.assert(
      fc.asyncProperty(providerBytes, contentType, async (bytes, type) => {
        const { fetchImpl, calls } = recordingFetch(() => responseFor(bytes, type));
        const tts = createOpenRouterTts({ apiKey: "k", model: "m", voice: "v1", fetch: fetchImpl });

        const audio = await tts.synthesize("x");

        expect(calls[0]?.body.response_format).toBe("mp3");
        expect(audio).toEqual({ data: bytes, mimeType: type ?? "audio/mpeg" });
      }),
    );
  });
});
