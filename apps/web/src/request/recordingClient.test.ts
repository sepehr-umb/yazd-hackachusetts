import { describe, expect, it } from "vitest";
import { createRecordingClient } from "./recordingClient";

const recording = new Blob(["voice"], { type: "audio/webm" });

function fakeFetch(response: Response) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init: init ?? {} });
    return response.clone();
  };
  return { fetchImpl, calls };
}

describe("createRecordingClient", () => {
  it("posts the recording to /audio with its own content type and returns the result", async () => {
    const result = { status: "succeeded", agent: "comms", reply: "دارم زنگ می‌زنم" };
    const { fetchImpl, calls } = fakeFetch(new Response(JSON.stringify(result)));

    const submitted = await createRecordingClient({ fetch: fetchImpl }).submit(recording);

    expect(submitted).toEqual(result);
    expect(calls[0]?.url).toBe("/audio");
    expect(calls[0]?.init.method).toBe("POST");
    expect(calls[0]?.init.headers).toEqual({ "content-type": "audio/webm" });
    expect(calls[0]?.init.body).toBe(recording);
  });

  it("adds the language header when getLanguage returns one", async () => {
    const result = { status: "succeeded", agent: "comms", reply: "ok" };
    const { fetchImpl, calls } = fakeFetch(new Response(JSON.stringify(result)));

    await createRecordingClient({ fetch: fetchImpl, getLanguage: () => "fa" }).submit(recording);

    expect(calls[0]?.init.headers).toEqual({
      "content-type": "audio/webm",
      "x-yazd-language": "fa",
    });
  });

  it("adds no header when getLanguage is missing or returns undefined", async () => {
    const result = { status: "succeeded", agent: "comms", reply: "ok" };
    const { fetchImpl, calls } = fakeFetch(new Response(JSON.stringify(result)));

    await createRecordingClient({ fetch: fetchImpl }).submit(recording);
    await createRecordingClient({ fetch: fetchImpl, getLanguage: () => undefined }).submit(
      recording,
    );

    expect(calls[0]?.init.headers).toEqual({ "content-type": "audio/webm" });
    expect(calls[1]?.init.headers).toEqual({ "content-type": "audio/webm" });
  });

  it("reads getLanguage on each submit", async () => {
    const result = { status: "succeeded", agent: "comms", reply: "ok" };
    const { fetchImpl, calls } = fakeFetch(new Response(JSON.stringify(result)));
    let language: string | undefined = "fa";
    const client = createRecordingClient({ fetch: fetchImpl, getLanguage: () => language });

    await client.submit(recording);
    language = undefined;
    await client.submit(recording);

    expect(calls[0]?.init.headers).toEqual({
      "content-type": "audio/webm",
      "x-yazd-language": "fa",
    });
    expect(calls[1]?.init.headers).toEqual({ "content-type": "audio/webm" });
  });

  it("throws the server's error message when the request fails", async () => {
    const { fetchImpl } = fakeFetch(
      new Response(JSON.stringify({ error: "Nothing was heard in the recording" }), {
        status: 422,
      }),
    );

    await expect(createRecordingClient({ fetch: fetchImpl }).submit(recording)).rejects.toThrow(
      "Nothing was heard in the recording",
    );
  });

  it("throws when the response is not a request result", async () => {
    const { fetchImpl } = fakeFetch(new Response(JSON.stringify({ hello: 1 })));

    await expect(createRecordingClient({ fetch: fetchImpl }).submit(recording)).rejects.toThrow(
      "Unexpected response from the server",
    );
  });
});
