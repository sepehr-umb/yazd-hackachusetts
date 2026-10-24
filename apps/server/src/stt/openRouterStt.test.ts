import { describe, expect, it } from "vitest";
import { createOpenRouterStt } from "./openRouterStt";

function fakeFetch(respond: () => Response) {
  const calls: Array<{
    url: string;
    headers: Record<string, string>;
    body: { input_audio: { format: string } } & Record<string, unknown>;
  }> = [];
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

const recording = { data: Buffer.from("voice"), mimeType: "audio/webm;codecs=opus" };

describe("createOpenRouterStt", () => {
  it("posts the base64 recording to the transcription endpoint and returns the text", async () => {
    const { fetchImpl, calls } = fakeFetch(() => new Response(JSON.stringify({ text: "سلام" })));
    const stt = createOpenRouterStt({ apiKey: "sk-test", model: "vendor/stt", fetch: fetchImpl });

    const text = await stt.transcribe(recording);

    expect(text).toBe("سلام");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://openrouter.ai/api/v1/audio/transcriptions");
    expect(calls[0]?.headers.authorization).toBe("Bearer sk-test");
    expect(calls[0]?.body).toEqual({
      model: "vendor/stt",
      input_audio: { data: Buffer.from("voice").toString("base64"), format: "webm" },
    });
  });

  it.each([
    ["audio/mp4", "m4a"],
    ["audio/mpeg", "mp3"],
    ["audio/wav", "wav"],
    ["audio/ogg;codecs=opus", "ogg"],
  ])("names %s recordings %s", async (mimeType, format) => {
    const { fetchImpl, calls } = fakeFetch(() => new Response(JSON.stringify({ text: "x" })));
    const stt = createOpenRouterStt({ apiKey: "k", model: "m", fetch: fetchImpl });

    await stt.transcribe({ data: Buffer.from("v"), mimeType });

    expect(calls[0]?.body.input_audio.format).toBe(format);
  });

  it("never sends a language hint", async () => {
    const { fetchImpl, calls } = fakeFetch(() => new Response(JSON.stringify({ text: "x" })));
    await createOpenRouterStt({ apiKey: "k", model: "m", fetch: fetchImpl }).transcribe(recording);

    expect(JSON.stringify(calls[0]?.body)).not.toContain("language");
  });

  it("sends the language when given", async () => {
    const { fetchImpl, calls } = fakeFetch(() => new Response(JSON.stringify({ text: "x" })));
    await createOpenRouterStt({ apiKey: "k", model: "m", fetch: fetchImpl }).transcribe(
      recording,
      { language: "fa" },
    );

    expect(calls[0]?.body.language).toBe("fa");
  });

  it("omits the language key when options hold none", async () => {
    const { fetchImpl, calls } = fakeFetch(() => new Response(JSON.stringify({ text: "x" })));
    await createOpenRouterStt({ apiKey: "k", model: "m", fetch: fetchImpl }).transcribe(
      recording,
      {},
    );

    expect("language" in (calls[0]?.body ?? {})).toBe(false);
  });

  it("throws with the provider message when the request fails", async () => {
    const { fetchImpl } = fakeFetch(
      () => new Response(JSON.stringify({ error: { message: "bad key" } }), { status: 401 }),
    );
    const stt = createOpenRouterStt({ apiKey: "k", model: "m", fetch: fetchImpl });

    await expect(stt.transcribe(recording)).rejects.toThrow(
      "OpenRouter transcription failed (401): bad key",
    );
  });

  it("throws when the recording format is not supported", async () => {
    const { fetchImpl } = fakeFetch(() => new Response("{}"));
    const stt = createOpenRouterStt({ apiKey: "k", model: "m", fetch: fetchImpl });

    await expect(stt.transcribe({ data: Buffer.from("v"), mimeType: "video/x" })).rejects.toThrow(
      "Unsupported recording type: video/x",
    );
  });

  it("throws when the response holds no text", async () => {
    const { fetchImpl } = fakeFetch(() => new Response(JSON.stringify({})));
    const stt = createOpenRouterStt({ apiKey: "k", model: "m", fetch: fetchImpl });

    await expect(stt.transcribe(recording)).rejects.toThrow("OpenRouter returned no transcription");
  });
});
