import { afterEach, describe, expect, it, vi } from "vitest";
import { createEventHub } from "./events/eventHub";
import { replayConversations } from "./llm/replayConversations";
import { createTranscriptReplayLlmClient } from "./llm/transcriptReplayLlmClient";
import { createOrchestrator, createStubTools } from "./orchestrator";
import { createServer } from "./server";
import { createStubStt } from "./stt/stubStt";
import { createStubTranslator } from "./translation/stubTranslator";
import type { Tts } from "./tts/tts";

const apiKey = "sk-secret-key";

function rejectingTts(message: string): Tts {
  return {
    synthesize: async () => {
      throw Object.assign(new Error(message), { apiKey });
    },
  };
}

function buildApp(tts: Tts) {
  const hub = createEventHub();
  const orchestrator = createOrchestrator({
    llm: createTranscriptReplayLlmClient(replayConversations),
    tools: createStubTools().tools,
    bus: hub,
  });
  return createServer({
    orchestrator,
    hub,
    stt: createStubStt(),
    tts,
    translator: createStubTranslator(),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("speech failure logging", () => {
  it("logs the message of a rejected synthesis, never the key, and still completes the request", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = buildApp(rejectingTts("OpenRouter speech failed (400): voice rejected"));

    const response = await app.inject({
      method: "POST",
      url: "/request",
      payload: { text: "به مامان زنگ بزن" },
    });
    await app.close();

    const args = consoleError.mock.calls.flat();
    const logged = args.join(" ");
    expect(response.statusCode).toBe(200);
    expect(args.every((arg) => typeof arg === "string")).toBe(true);
    expect(logged).toContain("OpenRouter speech failed (400): voice rejected");
    expect(logged).not.toContain(apiKey);
  });
});
