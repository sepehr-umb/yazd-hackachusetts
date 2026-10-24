import type { AssistantEvent } from "@mahmood/contracts";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createEventHub } from "./events/eventHub";
import { replayConversations } from "./llm/replayConversations";
import { createTranscriptReplayLlmClient } from "./llm/transcriptReplayLlmClient";
import { createOrchestrator, createStubTools } from "./orchestrator";
import type { StubToolOptions } from "./orchestrator";
import { createServer } from "./server";
import { createStubStt } from "./stt/stubStt";
import { createStubTranslator } from "./translation/stubTranslator";
import { createStubTts } from "./tts/stubTts";

const openServers: FastifyInstance[] = [];

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((app) => app.close()));
});

async function run(text: string, toolOptions: StubToolOptions = {}) {
  const hub = createEventHub();
  const events: AssistantEvent[] = [];
  hub.subscribe((event) => events.push(event));
  const app = createServer({
    orchestrator: createOrchestrator({
      llm: createTranscriptReplayLlmClient(replayConversations),
      tools: createStubTools(toolOptions).tools,
      bus: hub,
    }),
    hub,
    stt: createStubStt(),
    tts: createStubTts(),
    translator: createStubTranslator(),
  });
  openServers.push(app);
  const response = await app.inject({ method: "POST", url: "/request", payload: { text } });
  return { body: response.json(), events };
}

const shape = (events: AssistantEvent[]) =>
  events.map((event) => {
    if (event.type === "state") return `state:${event.state}`;
    if (event.type === "agent") return `agent:${event.agent}`;
    if (event.type === "tool_call") return `tool_call:${event.tool}:${event.status}`;
    if (event.type === "caption") return `caption:${event.speaker}`;
    return event.type;
  });

describe("event order and request result", () => {
  it("keeps the events of a succeeded request", async () => {
    const { body, events } = await run("به مامان زنگ بزن");

    expect(body).toMatchObject({ status: "succeeded", agent: "comms" });
    expect(shape(events)).toMatchInlineSnapshot(`
      [
        "transcript",
        "state:thinking",
        "agent:orchestrator",
        "caption:user",
        "agent:comms",
        "tool_call:call_contact:started",
        "tool_call:call_contact:succeeded",
        "state:speaking",
        "caption:assistant",
        "speech",
      ]
    `);
  });

  it("keeps the events of a clarification", async () => {
    const { body, events } = await run("روشنش کن");

    expect(body).toMatchObject({ status: "clarification", agent: "clarifier" });
    expect(shape(events)).toMatchInlineSnapshot(`
      [
        "transcript",
        "state:thinking",
        "agent:orchestrator",
        "caption:user",
        "agent:clarifier",
        "tool_call:ask_for_clarification:started",
        "tool_call:ask_for_clarification:succeeded",
        "state:speaking",
        "caption:assistant",
        "speech",
      ]
    `);
  });

  it("keeps the events and the original failure of an unroutable request", async () => {
    const { body, events } = await run("هوا فردا چطور است؟");

    expect(body).toEqual({ status: "failed", failure: { reason: "unroutable" } });
    expect(shape(events)).toMatchInlineSnapshot(`
      [
        "transcript",
        "state:thinking",
        "agent:orchestrator",
        "caption:user",
        "state:error",
        "caption:assistant",
        "speech",
      ]
    `);
  });

  it("keeps the events and the original failure of a failed tool", async () => {
    const { body, events } = await run("به مامان زنگ بزن", {
      failures: { call_contact: "line busy" },
    });

    expect(body).toEqual({
      status: "failed",
      agent: "comms",
      failure: { reason: "tool_failed", tool: "call_contact", error: "line busy" },
    });
    expect(shape(events)).toMatchInlineSnapshot(`
      [
        "transcript",
        "state:thinking",
        "agent:orchestrator",
        "caption:user",
        "agent:comms",
        "tool_call:call_contact:started",
        "tool_call:call_contact:failed",
        "state:error",
        "caption:assistant",
        "speech",
      ]
    `);
  });
});
