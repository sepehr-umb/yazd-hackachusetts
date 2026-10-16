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
});
