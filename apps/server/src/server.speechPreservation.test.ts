import { describe, expect, it } from "vitest";
import type { AssistantEvent } from "@mahmood/contracts";
import { createEventHub } from "./events/eventHub";
import { replayConversations } from "./llm/replayConversations";
import { createTranscriptReplayLlmClient } from "./llm/transcriptReplayLlmClient";
import { createOrchestrator, createStubTools } from "./orchestrator";
import { createServer } from "./server";
import { createStubStt } from "./stt/stubStt";
import { createStubTranslator } from "./translation/stubTranslator";
import type { Tts } from "./tts/tts";

const rejectingTts: Tts = {
  synthesize: async () => {
    throw new Error("voice rejected");
  },
};

async function requestWith(tts: Tts) {
  const hub = createEventHub();
  const events: AssistantEvent[] = [];
  hub.subscribe((event) => events.push(event));
  const orchestrator = createOrchestrator({
    llm: createTranscriptReplayLlmClient(replayConversations),
    tools: createStubTools().tools,
    bus: hub,
  });
  const app = createServer({
    orchestrator,
    hub,
    stt: createStubStt(),
    tts,
    translator: createStubTranslator(),
  });
  const response = await app.inject({
    method: "POST",
    url: "/request",
    payload: { text: "به مامان زنگ بزن" },
  });
  await app.close();
  return { response, events };
}

describe("speech preservation", () => {
  it("delivers both captions and finishes the request when synthesis rejects", async () => {
    const { response, events } = await requestWith(rejectingTts);

    const speakers = events.flatMap((event) => (event.type === "caption" ? [event.speaker] : []));
    expect(response.statusCode).toBe(200);
    expect(speakers).toEqual(["user", "assistant"]);
    expect(events.some((event) => event.type === "speech")).toBe(false);
  });
});
