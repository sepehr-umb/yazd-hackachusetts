import { fixtureContacts } from "@mahmood/contacts";
import type { RequestResult } from "@mahmood/contracts";
import { friendlyApology } from "@mahmood/strings";
import { describe, expect, it } from "vitest";
import { withContactResolution } from "../contacts/withContactResolution";
import callMom from "../orchestrator/fixtures/callMom.json";
import sendMessageUnknownContact from "../orchestrator/fixtures/sendMessageUnknownContact.json";
import { createOrchestrator, createStubTools } from "../orchestrator";
import type { LlmResponse } from "../orchestrator";
import { createRecordingEventBus } from "../orchestrator/testing/recordingEventBus";
import { createReplayLlmClient } from "../orchestrator/testing/replayLlmClient";
import type { RecordedConversation } from "../orchestrator/testing/replayLlmClient";
import { createReplier } from "./replier";

const request = "به مامان زنگ بزن";

async function replyTo(result: RequestResult, text: string) {
  return createReplier({}).reply(result, text);
}

function endlessCalls(turns: number): LlmResponse[] {
  const [routing, toolTurn] = (callMom as RecordedConversation).responses as [
    LlmResponse,
    LlmResponse,
  ];
  return [routing, ...Array.from({ length: turns }, () => toolTurn)];
}

describe("failure modes keep a friendly reply", () => {
  it("answers too_many_steps with the apology and does not add orchestrator model calls", async () => {
    const llm = createReplayLlmClient(endlessCalls(6));
    const orchestrator = createOrchestrator({
      llm,
      tools: createStubTools().tools,
      bus: createRecordingEventBus(),
    });

    const result = await orchestrator.handle(request);
    const callsBefore = llm.requests.length;
    const reply = await replyTo(result, request);

    expect(result).toMatchObject({ status: "failed", failure: { reason: "too_many_steps" } });
    expect(reply).toBe(friendlyApology({ reason: "too_many_steps" }, request));
    expect(llm.requests).toHaveLength(callsBefore);
  });

  it("answers tool_failed from a throwing tool with the apology", async () => {
    const stubs = createStubTools();
    const tools = {
      ...stubs.tools,
      call_contact: {
        name: "call_contact" as const,
        execute: async (): Promise<never> => {
          throw new Error("device shell crashed");
        },
      },
    };
    const orchestrator = createOrchestrator({
      llm: createReplayLlmClient((callMom as RecordedConversation).responses),
      tools,
      bus: createRecordingEventBus(),
    });

    const result = await orchestrator.handle(request);
    const reply = await replyTo(result, request);

    expect(result.status).toBe("failed");
    if (result.status !== "failed") return;
    expect(result.failure.reason).toBe("tool_failed");
    expect(reply).toBe(friendlyApology(result.failure, request));
    expect(reply).not.toContain("device shell crashed");
    expect(reply).not.toContain("call_contact");
  });

  it("answers an Italian unknown contact with an Italian reply, started then succeeded", async () => {
    const conversation = sendMessageUnknownContact as RecordedConversation;
    const stubs = createStubTools();
    const bus = createRecordingEventBus();
    const orchestrator = createOrchestrator({
      llm: createReplayLlmClient(conversation.responses),
      tools: withContactResolution(stubs.tools, fixtureContacts),
      bus,
    });

    const result = await orchestrator.handle(conversation.transcript);

    expect(result).toEqual({
      status: "succeeded",
      agent: "comms",
      reply: "Non trovo nessun cugino tra i tuoi contatti. A chi vuoi scrivere?",
    });
    expect(stubs.calls).toEqual([]);
    const statuses = bus.events
      .filter((event) => event.type === "tool_call" && event.tool === "send_message")
      .map((event) => (event.type === "tool_call" ? event.status : undefined));
    expect(statuses).toEqual(["started", "succeeded"]);
  });
});
