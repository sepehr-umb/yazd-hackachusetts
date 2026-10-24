import { fixtureContacts } from "@mahmood/contacts";
import { describe, expect, it } from "vitest";
import callAhmadi from "../orchestrator/fixtures/callAhmadi.json";
import { createOrchestrator } from "../orchestrator/orchestrator";
import { createStubTools } from "../orchestrator/stubTools";
import { createRecordingEventBus } from "../orchestrator/testing/recordingEventBus";
import { createReplayLlmClient } from "../orchestrator/testing/replayLlmClient";
import type { RecordedConversation } from "../orchestrator/testing/replayLlmClient";
import { replayConversations } from "../llm/replayConversations";
import { createTranscriptReplayLlmClient } from "../llm/transcriptReplayLlmClient";
import { withContactResolution } from "./withContactResolution";

const conversation = callAhmadi as RecordedConversation;
const question = "می‌خواهید با کدام یک تماس بگیرم: حسین احمدی یا حسن احمدی؟";

async function replay() {
  const stubs = createStubTools();
  const bus = createRecordingEventBus();
  const orchestrator = createOrchestrator({
    llm: createReplayLlmClient(conversation.responses),
    tools: withContactResolution(stubs.tools, fixtureContacts),
    bus,
  });
  const result = await orchestrator.handle(conversation.transcript);
  return { result, bus, calls: stubs.calls };
}

async function replayFollowUp() {
  const stubs = createStubTools();
  const orchestrator = createOrchestrator({
    llm: createTranscriptReplayLlmClient(replayConversations),
    tools: withContactResolution(stubs.tools, fixtureContacts),
    bus: createRecordingEventBus(),
  });
  const first = await orchestrator.handle("به احمدی زنگ بزن");
  const result = await orchestrator.handle("حسین", {
    history: { request: "به احمدی زنگ بزن", question },
  });
  return { first, result, calls: stubs.calls };
}

describe("call Ahmadi follow-up replay", () => {
  it("asks first, then calls Hossein Ahmadi once the answer arrives with its history", async () => {
    const { first, result, calls } = await replayFollowUp();

    expect(first).toEqual({ status: "succeeded", agent: "comms", reply: question });
    expect(result).toEqual({
      status: "succeeded",
      agent: "comms",
      reply: "دارم به حسین احمدی زنگ می‌زنم",
    });
    expect(calls).toEqual([{ tool: "call_contact", input: { contact: "حسین احمدی" } }]);
  });
});

describe("call Ahmadi demo replay", () => {
  it("ends succeeded with a question that names both options", async () => {
    const { result } = await replay();

    expect(result).toEqual({ status: "succeeded", agent: "comms", reply: question });
    expect(question).toContain("حسین احمدی");
    expect(question).toContain("حسن احمدی");
  });

  it("never reaches the underlying call tool, so no contact is guessed", async () => {
    const { calls } = await replay();

    expect(calls).toEqual([]);
  });

  it("emits call_contact started then succeeded and never failed", async () => {
    const { bus } = await replay();

    const statuses = bus.events
      .filter((event) => event.type === "tool_call" && event.tool === "call_contact")
      .map((event) => (event.type === "tool_call" ? event.status : undefined));
    expect(statuses).toEqual(["started", "succeeded"]);
  });
});
