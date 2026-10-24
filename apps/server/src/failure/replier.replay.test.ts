import type { RequestResult } from "@mahmood/contracts";
import { friendlyApology } from "@mahmood/strings";
import { afterEach, describe, expect, it, vi } from "vitest";
import { selectLlmClient } from "../llm/selectLlmClient";
import type { LlmClient, LlmRequest } from "../orchestrator";
import { createReplier } from "./replier";

const failure = { reason: "llm_error", message: "boom" } as const;
const failed: RequestResult = { status: "failed", failure };
const unknownRequest = "chiama mamma";

function recording(llm: LlmClient) {
  const requests: LlmRequest[] = [];
  const wrapped: LlmClient = {
    complete: (request) => {
      requests.push(request);
      return llm.complete(request);
    },
  };
  return { wrapped, requests };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("replier with the offline replay model", () => {
  it("falls back to the apology table for a request the replay model does not know", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { wrapped, requests } = recording(selectLlmClient({}));

    const text = await createReplier({ llm: wrapped }).reply(failed, unknownRequest);

    expect(requests).toHaveLength(1);
    expect(text).toBe(friendlyApology(failure, unknownRequest));
    expect(text).toBe("Mi dispiace, non ci sono riuscito. Riprova tra poco.");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("treats a blank key as offline and still never reaches the network", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const llm = selectLlmClient({ OPENROUTER_API_KEY: "   " });

    const text = await createReplier({ llm }).reply(failed, "یک درخواست ناشناخته");

    expect(text).toBe(friendlyApology(failure, "یک درخواست ناشناخته"));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
