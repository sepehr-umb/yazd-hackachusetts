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
});
