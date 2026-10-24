import { toolNames } from "@mahmood/contracts";
import type { AssistantEvent, RequestResult } from "@mahmood/contracts";
import { describeFailure, friendlyApology } from "@mahmood/strings";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createEventHub } from "../events/eventHub";
import { createOrchestrator, createStubTools } from "../orchestrator";
import type { LlmClient } from "../orchestrator";
import { createServer } from "../server";
import { createStubStt } from "../stt/stubStt";
import { createStubTranslator } from "../translation/stubTranslator";
import type { Tts } from "../tts/tts";

const failingLlm: LlmClient = {
  complete: async () => {
    throw new Error("upstream exploded");
  },
};

const hangingLlm: LlmClient = { complete: () => new Promise(() => undefined) };

function buildHarness(apologyLlm?: LlmClient) {
  const hub = createEventHub();
  const events: AssistantEvent[] = [];
  hub.subscribe((event) => events.push(event));
  const spoken: string[] = [];
  const tts: Tts = {
    synthesize: async (input) => {
      spoken.push(input);
      return { data: Buffer.from("audio"), mimeType: "audio/mpeg" };
    },
  };
  const orchestrator = createOrchestrator({
    llm: failingLlm,
    tools: createStubTools().tools,
    bus: hub,
  });
  const app = createServer({
    orchestrator,
    hub,
    stt: createStubStt(),
    tts,
    translator: createStubTranslator(),
    apologyLlm,
  });
  return { app, events, spoken };
}

async function failedRequest(text: string, apologyLlm?: LlmClient) {
  const { app, events, spoken } = buildHarness(apologyLlm);
  const response = await app.inject({ method: "POST", url: "/request", payload: { text } });
  await app.close();
  const result = response.json() as RequestResult;
  const caption = events.find((e) => e.type === "caption" && e.speaker === "assistant");
  return {
    result,
    caption: caption?.type === "caption" ? caption.text : "",
    spoken: spoken[0] ?? "",
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("friendly failure", () => {
  it("speaks and captions one apology without tool names or failure text", async () => {
    const { result, caption, spoken } = await failedRequest("chiama mamma");

    expect(result.status).toBe("failed");
    const technical = result.status === "failed" ? describeFailure(result.failure) : "";
    for (const text of [caption, spoken]) {
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toContain(technical);
      expect(text).not.toContain("upstream exploded");
      for (const name of toolNames) expect(text.toLowerCase()).not.toContain(name);
    }
    expect(caption).toBe(spoken);
  });

  it("completes with the table text when the apology model hangs", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const pending = failedRequest("chiama mamma", hangingLlm);
    for (let tick = 0; tick < 10; tick++) await vi.advanceTimersByTimeAsync(1000);
    const { result, caption, spoken } = await pending;

    expect(result.status).toBe("failed");
    if (result.status !== "failed") return;
    const expected = friendlyApology(result.failure, "chiama mamma");
    expect(caption).toBe(expected);
    expect(spoken).toBe(expected);
  });

  it("still returns the original failed result from /request", async () => {
    const { result } = await failedRequest("chiama mamma");

    expect(result).toEqual({ status: "failed", failure: { reason: "llm_error", message: "upstream exploded" } });
  });
});
