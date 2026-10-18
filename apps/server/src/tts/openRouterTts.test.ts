import { describe, expect, it } from "vitest";
import { createOpenRouterTts } from "./openRouterTts";

function fakeFetch(respond: () => Response) {
  const calls: Array<{ url: string; headers: Record<string, string>; body: Record<string, unknown> }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({
      url: String(input),
      headers: init?.headers as Record<string, string>,
      body: JSON.parse(String(init?.body)),
    });
    return respond();
  };
  return { fetchImpl, calls };
}

describe("createOpenRouterTts", () => {
  it("posts the text to the speech endpoint and returns the audio bytes", async () => {
    const { fetchImpl, calls } = fakeFetch(
      () => new Response(Buffer.from([9, 8, 7]), { headers: { "content-type": "audio/mpeg" } }),
    );
    const tts = createOpenRouterTts({ apiKey: "sk-test", model: "vendor/tts", fetch: fetchImpl });

    const audio = await tts.synthesize("سلام");

    expect(audio).toEqual({ data: Buffer.from([9, 8, 7]), mimeType: "audio/mpeg" });
    expect(calls[0]?.url).toBe("https://openrouter.ai/api/v1/audio/speech");
    expect(calls[0]?.headers.authorization).toBe("Bearer sk-test");
    expect(calls[0]?.body).toEqual({
      model: "vendor/tts",
      input: "سلام",
      voice: "alloy",
      response_format: "mp3",
    });
  });

  it("falls back to audio/mpeg when the response names no type", async () => {
    const { fetchImpl } = fakeFetch(() => new Response(Buffer.from([1])));
    const tts = createOpenRouterTts({ apiKey: "k", model: "m", fetch: fetchImpl });

    expect((await tts.synthesize("x")).mimeType).toBe("audio/mpeg");
  });

  it("throws with the provider message when the request fails", async () => {
    const { fetchImpl } = fakeFetch(
      () => new Response(JSON.stringify({ error: { message: "no credits" } }), { status: 402 }),
    );
    const tts = createOpenRouterTts({ apiKey: "k", model: "m", fetch: fetchImpl });

    await expect(tts.synthesize("x")).rejects.toThrow("OpenRouter speech failed (402): no credits");
  });
});
