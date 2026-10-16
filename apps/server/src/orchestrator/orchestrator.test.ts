import { describe, expect, it } from "vitest";
import type { LlmResponse } from "./llmClient";
import { createOrchestrator } from "./orchestrator";
import { createStubTools } from "./stubTools";
import { createRecordingEventBus } from "./testing/recordingEventBus";
import { createReplayLlmClient } from "./testing/replayLlmClient";
import type { RecordedConversation } from "./testing/replayLlmClient";
import callMom from "./fixtures/callMom.json";
import ambiguousTurnOn from "./fixtures/ambiguousTurnOn.json";
import lightOn from "./fixtures/lightOn.json";
import pauseTv from "./fixtures/pauseTv.json";

function lastText(conversation: RecordedConversation): string {
  const last = conversation.responses.at(-1) as LlmResponse;
  return last.content.map((block) => (block.type === "text" ? block.text : "")).join("");
}

describe("orchestrator", () => {
  it("routes a call request to comms and calls the contact", async () => {
    const conversation = callMom as RecordedConversation;
    const { tools, calls } = createStubTools();
    const orchestrator = createOrchestrator({
      llm: createReplayLlmClient(conversation.responses),
      tools,
      bus: createRecordingEventBus(),
    });

    const result = await orchestrator.handle(conversation.transcript);

    expect(result).toEqual({ status: "succeeded", agent: "comms", reply: lastText(conversation) });
    expect(calls).toEqual([{ tool: "call_contact", input: { contact: "مامان" } }]);
  });

  it("emits state, agent and tool call events in order", async () => {
    const conversation = callMom as RecordedConversation;
    const bus = createRecordingEventBus();
    const orchestrator = createOrchestrator({
      llm: createReplayLlmClient(conversation.responses),
      tools: createStubTools().tools,
      bus,
    });

    await orchestrator.handle(conversation.transcript);

    expect(bus.events).toEqual([
      { type: "state", state: "thinking" },
      { type: "agent", agent: "orchestrator" },
      { type: "agent", agent: "comms" },
      { type: "tool_call", tool: "call_contact", status: "started" },
      { type: "tool_call", tool: "call_contact", status: "succeeded" },
      { type: "state", state: "speaking" },
    ]);
  });

  it("routes a light request to home and sets the light", async () => {
    const conversation = lightOn as RecordedConversation;
    const { tools, calls } = createStubTools();
    const orchestrator = createOrchestrator({
      llm: createReplayLlmClient(conversation.responses),
      tools,
      bus: createRecordingEventBus(),
    });

    const result = await orchestrator.handle(conversation.transcript);

    expect(result).toEqual({ status: "succeeded", agent: "home", reply: lastText(conversation) });
    expect(calls).toEqual([{ tool: "set_light", input: { room: "اتاق خواب", on: true } }]);
  });

  it("routes an ambiguous request to the clarifier and returns its question", async () => {
    const conversation = ambiguousTurnOn as RecordedConversation;
    const llm = createReplayLlmClient(conversation.responses);
    const { tools, calls } = createStubTools();
    const orchestrator = createOrchestrator({ llm, tools, bus: createRecordingEventBus() });

    const result = await orchestrator.handle(conversation.transcript);

    expect(result).toEqual({
      status: "clarification",
      agent: "clarifier",
      question: "کدام را روشن کنم؟ چراغ یا تلویزیون؟",
    });
    expect(calls).toEqual([
      {
        tool: "ask_for_clarification",
        input: { question: "کدام را روشن کنم؟ چراغ یا تلویزیون؟" },
      },
    ]);
    expect(llm.requests).toHaveLength(2);
  });

  it("routes a TV request to media and controls playback", async () => {
    const conversation = pauseTv as RecordedConversation;
    const { tools, calls } = createStubTools();
    const orchestrator = createOrchestrator({
      llm: createReplayLlmClient(conversation.responses),
      tools,
      bus: createRecordingEventBus(),
    });

    const result = await orchestrator.handle(conversation.transcript);

    expect(result).toEqual({ status: "succeeded", agent: "media", reply: lastText(conversation) });
    expect(calls).toEqual([{ tool: "media_control", input: { action: "pause" } }]);
  });

  describe("when a tool fails", () => {
    async function runFailingCall() {
      const conversation = callMom as RecordedConversation;
      const llm = createReplayLlmClient(conversation.responses);
      const bus = createRecordingEventBus();
      const { tools } = createStubTools({ failures: { call_contact: "no network" } });
      const orchestrator = createOrchestrator({ llm, tools, bus });
      const result = await orchestrator.handle(conversation.transcript);
      return { result, llm, bus, conversation };
    }

    it("returns a failure result naming the tool and error", async () => {
      const { result } = await runFailingCall();

      expect(result).toEqual({
        status: "failed",
        agent: "comms",
        failure: { reason: "tool_failed", tool: "call_contact", error: "no network" },
      });
    });

    it("never relays the model's success message", async () => {
      const { result, conversation } = await runFailingCall();

      expect(JSON.stringify(result)).not.toContain(lastText(conversation));
    });

    it("does not ask the model to narrate after the failure", async () => {
      const { llm } = await runFailingCall();

      expect(llm.requests).toHaveLength(2);
    });

    it("emits a failed tool call and the error state, never success", async () => {
      const { bus } = await runFailingCall();

      expect(bus.events).toEqual([
        { type: "state", state: "thinking" },
        { type: "agent", agent: "orchestrator" },
        { type: "agent", agent: "comms" },
        { type: "tool_call", tool: "call_contact", status: "started" },
        { type: "tool_call", tool: "call_contact", status: "failed" },
        { type: "state", state: "error" },
      ]);
    });
  });
});
