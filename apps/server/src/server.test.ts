import type { AssistantEvent } from "@mahmood/contracts";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createEventHub } from "./events/eventHub";
import { replayConversations } from "./llm/replayConversations";
import { createTranscriptReplayLlmClient } from "./llm/transcriptReplayLlmClient";
import { createOrchestrator, createStubTools } from "./orchestrator";
import { createServer } from "./server";

const openServers: FastifyInstance[] = [];

function setup(options: { idleAfterMs?: number } = {}) {
  const hub = createEventHub();
  const stub = createStubTools();
  const orchestrator = createOrchestrator({
    llm: createTranscriptReplayLlmClient(replayConversations),
    tools: stub.tools,
    bus: hub,
  });
  const app = createServer({ orchestrator, hub, ...options });
  openServers.push(app);
  return { app, hub, calls: stub.calls };
}

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((app) => app.close()));
});

describe("POST /request", () => {
  it("runs the orchestrator on the typed text and responds with its result", async () => {
    const { app, calls } = setup();

    const response = await app.inject({
      method: "POST",
      url: "/request",
      payload: { text: "به مامان زنگ بزن" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "succeeded",
      agent: "comms",
      reply: "دارم به مامان زنگ می‌زنم",
    });
    expect(calls).toEqual([{ tool: "call_contact", input: { contact: "مامان" } }]);
  });

  it("announces the typed text as a transcript event before the orchestrator starts", async () => {
    const { app, hub } = setup();
    const events: AssistantEvent[] = [];
    hub.subscribe((event) => events.push(event));

    await app.inject({ method: "POST", url: "/request", payload: { text: "به مامان زنگ بزن" } });

    expect(events.slice(0, 3)).toEqual([
      { type: "transcript", text: "به مامان زنگ بزن" },
      { type: "state", state: "thinking" },
      { type: "agent", agent: "orchestrator" },
    ]);
  });
});
