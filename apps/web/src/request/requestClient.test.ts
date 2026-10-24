import type { RequestResult } from "@mahmood/contracts";
import { describe, expect, it } from "vitest";
import { createRequestClient } from "./requestClient";

function fakeFetch(reply: { status?: number; body: unknown }) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init: init ?? {} });
    return new Response(JSON.stringify(reply.body), {
      status: reply.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { fetchImpl, calls };
}

describe("createRequestClient", () => {
  it("posts the text as JSON to /request and returns the result", async () => {
    const result: RequestResult = { status: "succeeded", agent: "comms", reply: "دارم زنگ می‌زنم" };
    const { fetchImpl, calls } = fakeFetch({ body: result });
    const client = createRequestClient({ fetch: fetchImpl });

    const outcome = await client.submit("به مامان زنگ بزن");

    expect(outcome).toEqual(result);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("/request");
    expect(calls[0]?.init.method).toBe("POST");
    expect(calls[0]?.init.headers).toEqual({ "content-type": "application/json" });
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ text: "به مامان زنگ بزن" });
  });

  it("adds the language to the body when getLanguage returns one", async () => {
    const result: RequestResult = { status: "succeeded", agent: "comms", reply: "ok" };
    const { fetchImpl, calls } = fakeFetch({ body: result });
    const client = createRequestClient({ fetch: fetchImpl, getLanguage: () => "fa" });

    await client.submit("..");

    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ text: "..", language: "fa" });
  });

  it("sends only the text when getLanguage is missing or returns undefined", async () => {
    const result: RequestResult = { status: "succeeded", agent: "comms", reply: "ok" };
    const { fetchImpl, calls } = fakeFetch({ body: result });

    await createRequestClient({ fetch: fetchImpl }).submit("hi");
    await createRequestClient({ fetch: fetchImpl, getLanguage: () => undefined }).submit("hi");

    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ text: "hi" });
    expect(JSON.parse(String(calls[1]?.init.body))).toEqual({ text: "hi" });
  });

  it("reads getLanguage on each submit", async () => {
    const result: RequestResult = { status: "succeeded", agent: "comms", reply: "ok" };
    const { fetchImpl, calls } = fakeFetch({ body: result });
    let language: string | undefined = "fa";
    const client = createRequestClient({ fetch: fetchImpl, getLanguage: () => language });

    await client.submit("one");
    language = "it";
    await client.submit("two");

    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ text: "one", language: "fa" });
    expect(JSON.parse(String(calls[1]?.init.body))).toEqual({ text: "two", language: "it" });
  });

  it("throws the server's error message when the request is rejected", async () => {
    const { fetchImpl } = fakeFetch({ status: 400, body: { error: "Body must be text" } });
    const client = createRequestClient({ fetch: fetchImpl });

    await expect(client.submit("")).rejects.toThrow("Body must be text");
  });

  it("throws when the response is not a request result", async () => {
    const { fetchImpl } = fakeFetch({ body: { hello: "world" } });
    const client = createRequestClient({ fetch: fetchImpl });

    await expect(client.submit("hi")).rejects.toThrow("Unexpected response from the server");
  });
});
