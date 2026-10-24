import { describe, expect, it } from "vitest";
import { createOrchestrator, createStubTools } from "../orchestrator";
import type { LlmRequest } from "../orchestrator";
import callAhmadi from "../orchestrator/fixtures/callAhmadi.json";
import callAhmadiHossein from "../orchestrator/fixtures/callAhmadiHossein.json";
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

  describe("follow-up seeds", () => {
    const history = { request: "به احمدی زنگ بزن", question: "حسین احمدی یا حسن احمدی؟" };
    const followUps = [callAhmadi, callAhmadiHossein] as RecordedConversation[];

    it("matches on the request and the follow-up answer", async () => {
      const orchestrator = orchestratorFor(followUps);

      expect(await orchestrator.handle("حسین", { history })).toEqual({
        status: "succeeded",
        agent: "comms",
        reply: "دارم به حسین احمدی زنگ می‌زنم",
      });
    });

    it("keeps the bare request on the conversation without a follow-up", async () => {
      const orchestrator = orchestratorFor(followUps);

      expect(await orchestrator.handle("به احمدی زنگ بزن")).toMatchObject({
        status: "succeeded",
        reply: "می‌خواهید با کدام یک تماس بگیرم: حسین احمدی یا حسن احمدی؟",
      });
    });

    it("offsets the step by one so the question message is not a model turn", async () => {
      const llm = createTranscriptReplayLlmClient(followUps);
      const toolRequest = {
        system: "",
        tools: [{ name: "call_contact", description: "", inputSchema: {} }],
        messages: [
          { role: "user", content: history.request },
          { role: "assistant", content: [{ type: "text", text: history.question }] },
          { role: "user", content: "حسین" },
        ],
      } as LlmRequest;

      const response = await llm.complete(toolRequest);

      expect(response.content[0]).toMatchObject({ type: "tool_use", name: "call_contact" });
    });

    it("fails as an LLM error for an answer nothing was recorded for", async () => {
      const orchestrator = orchestratorFor(followUps);

      expect(await orchestrator.handle("حسن", { history })).toEqual({
        status: "failed",
        failure: { reason: "llm_error", message: 'No recorded response for "حسن"' },
      });
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
