import { afterEach, describe, expect, it, vi } from "vitest";
import type { LlmClient, LlmRequest, LlmResponse } from "../orchestrator";
import { APOLOGY_TIMEOUT_MS, askModelForApology } from "./askModelForApology";

function recordingLlm(response: LlmResponse | Error) {
  const requests: LlmRequest[] = [];
  const llm: LlmClient = {
    complete: async (request) => {
      requests.push(request);
      if (response instanceof Error) throw response;
      return response;
    },
  };
  return { llm, requests };
}

const textResponse = (text: string): LlmResponse => ({
  content: [{ type: "text", text }],
  stopReason: "end_turn",
});

describe("askModelForApology", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the trimmed first text block", async () => {
    const { llm } = recordingLlm(textResponse("  Mi dispiace.  "));
    expect(await askModelForApology(llm, "chiama mamma")).toBe("Mi dispiace.");
  });

  it("calls the client once with no tools, a language-free prompt and the raw request", async () => {
    const { llm, requests } = recordingLlm(textResponse("ok"));
    await askModelForApology(llm, "chiama mamma");
    expect(requests).toHaveLength(1);
    expect(requests[0]?.tools).toEqual([]);
    expect(requests[0]?.messages).toEqual([{ role: "user", content: "chiama mamma" }]);
    expect(requests[0]?.system).toContain("the user's language");
    expect(requests[0]?.system).not.toMatch(/english|farsi|persian|arabic|italian/i);
  });

  it("appends the fallback sentence with the code when a preferred language is given", async () => {
    const plain = recordingLlm(textResponse("ok"));
    await askModelForApology(plain.llm, "..");
    const preferred = recordingLlm(textResponse("ok"));
    await askModelForApology(preferred.llm, "..", APOLOGY_TIMEOUT_MS, "fa");
    expect(preferred.requests[0]?.system).toBe(
      `${plain.requests[0]?.system} Reply in the language the user spoke. If you cannot tell which language that is, reply in fa.`,
    );
    expect(plain.requests[0]?.system).not.toContain("reply in fa");
  });

  it("returns undefined when the client throws", async () => {
    const { llm } = recordingLlm(new Error("boom"));
    expect(await askModelForApology(llm, "x")).toBeUndefined();
  });

  it("returns undefined when the client rejects", async () => {
    const llm: LlmClient = { complete: () => Promise.reject(new Error("no")) };
    expect(await askModelForApology(llm, "x")).toBeUndefined();
  });

  it("returns undefined for empty or whitespace text", async () => {
    expect(await askModelForApology(recordingLlm(textResponse("")).llm, "x")).toBeUndefined();
    expect(await askModelForApology(recordingLlm(textResponse("  \n ")).llm, "x")).toBeUndefined();
  });

  it("ignores tool-use blocks", async () => {
    const { llm } = recordingLlm({
      content: [{ type: "tool_use", id: "1", name: "call_contact", input: {} }],
      stopReason: "tool_use",
    });
    expect(await askModelForApology(llm, "x")).toBeUndefined();
  });

  it("returns undefined for a hung client after the timeout", async () => {
    vi.useFakeTimers();
    const llm: LlmClient = { complete: () => new Promise<LlmResponse>(() => undefined) };
    const pending = askModelForApology(llm, "x");
    await vi.advanceTimersByTimeAsync(APOLOGY_TIMEOUT_MS);
    expect(await pending).toBeUndefined();
  });

  it("clears the timer on success", async () => {
    vi.useFakeTimers();
    const { llm } = recordingLlm(textResponse("ok"));
    await askModelForApology(llm, "x");
    expect(vi.getTimerCount()).toBe(0);
  });
});
