import { describe, expect, it } from "vitest";
import { createOrchestrator, createStubTools } from "../orchestrator";
import callMom from "../orchestrator/fixtures/callMom.json";
import lightOn from "../orchestrator/fixtures/lightOn.json";
import { createRecordingEventBus } from "../orchestrator/testing/recordingEventBus";
import type { RecordedConversation } from "../orchestrator/testing/replayLlmClient";
import { createTranscriptReplayLlmClient } from "./transcriptReplayLlmClient";

const conversations = [callMom, lightOn] as RecordedConversation[];

function orchestratorFor(conversations: RecordedConversation[]) {
  return createOrchestrator({
    llm: createTranscriptReplayLlmClient(conversations),
    tools: createStubTools().tools,
    bus: createRecordingEventBus(),
  });
}

describe("createTranscriptReplayLlmClient", () => {
  it("replays the recorded conversation whose transcript matches the request", async () => {
    const orchestrator = orchestratorFor(conversations);

    expect(await orchestrator.handle("چراغ اتاق خواب را روشن کن")).toEqual({
      status: "succeeded",
      agent: "home",
      reply: "چراغ اتاق خواب روشن شد",
    });
    expect(await orchestrator.handle("به مامان زنگ بزن")).toEqual({
      status: "succeeded",
      agent: "comms",
      reply: "دارم به مامان زنگ می‌زنم",
    });
  });

  it("fails the request as an LLM error when nothing was recorded for the transcript", async () => {
    const orchestrator = orchestratorFor(conversations);

    expect(await orchestrator.handle("what time is it")).toEqual({
      status: "failed",
      failure: { reason: "llm_error", message: 'No recorded response for "what time is it"' },
    });
  });
});
