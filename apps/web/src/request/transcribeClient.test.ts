import { describe, expect, it } from "vitest";
import { createTranscribeClient } from "./transcribeClient";

function fakeFetch(status: number, payload: unknown) {
  const sent: Array<{ url: string; init?: RequestInit }> = [];
  const fetch = (async (url: string, init?: RequestInit) => {
    sent.push({ url, init });
    return new Response(JSON.stringify(payload), { status });
  }) as typeof globalThis.fetch;
  return { fetch, sent };
}

const recording = new Blob(["voice"], { type: "audio/webm" });

describe("transcribe client", () => {
  it("posts the recording to /transcribe with its type and returns text and language", async () => {
    const { fetch, sent } = fakeFetch(200, { text: "ciao", language: "it" });

    expect(await createTranscribeClient({ fetch }).transcribe(recording)).toEqual({
      text: "ciao",
      language: "it",
    });
    expect(sent[0]?.url).toBe("/transcribe");
    expect(sent[0]?.init?.method).toBe("POST");
    expect(sent[0]?.init?.headers).toEqual({ "content-type": "audio/webm" });
    expect(sent[0]?.init?.body).toBe(recording);
  });

  it("treats a missing or unknown language as none", async () => {
    expect(
      await createTranscribeClient(fakeFetch(200, { text: "" })).transcribe(recording),
    ).toEqual({
      text: "",
      language: undefined,
    });
    expect(
      await createTranscribeClient(fakeFetch(200, { text: "hallo", language: "de" })).transcribe(
        recording,
      ),
    ).toEqual({ text: "hallo", language: undefined });
  });

  it("throws the server's error message on a failed response", async () => {
    await expect(
      createTranscribeClient(
        fakeFetch(502, { error: "The recording could not be transcribed: timeout" }),
      ).transcribe(recording),
    ).rejects.toThrow("timeout");
  });

  it("throws on a response that is not a transcription", async () => {
    await expect(
      createTranscribeClient(fakeFetch(200, { nope: 1 })).transcribe(recording),
    ).rejects.toThrow("Unexpected response from the server");
  });
});
