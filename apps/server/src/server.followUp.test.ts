import { fixtureContacts } from "@mahmood/contacts";
import type { AssistantEvent } from "@mahmood/contracts";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { withContactResolution } from "./contacts/withContactResolution";
import { createEventHub } from "./events/eventHub";
import { replayConversations } from "./llm/replayConversations";
import { createTranscriptReplayLlmClient } from "./llm/transcriptReplayLlmClient";
import { createOrchestrator, createStubTools } from "./orchestrator";
import type { LlmClient } from "./orchestrator";
import { buildServer, createFakeClock } from "./serverTestKit";

const openServers: FastifyInstance[] = [];
const request = "به احمدی زنگ بزن";

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((app) => app.close()));
});

function flow() {
  const clock = createFakeClock();
  const hub = createEventHub();
  const events: AssistantEvent[] = [];
  hub.subscribe((event) => events.push(event));
  const stubs = createStubTools();
  const replay = createTranscriptReplayLlmClient(replayConversations);
  const routerSeeds: number[] = [];
  const llm: LlmClient = {
    complete: (llmRequest) => {
      if (llmRequest.system.includes("route")) routerSeeds.push(llmRequest.messages.length);
      return replay.complete(llmRequest);
    },
  };
  const orchestrator = createOrchestrator({
    llm,
    tools: withContactResolution(stubs.tools, fixtureContacts),
    bus: hub,
  });
  const { app } = buildServer({ orchestrator, hub, clock }, openServers);
  const say = (text: string) => app.inject({ method: "POST", url: "/request", payload: { text } });
  return { clock, say, events, calls: stubs.calls, routerSeeds };
}

function shapes(events: AssistantEvent[]) {
  const keys = events.map((event) => `${event.type}:${Object.keys(event).sort().join(",")}`);
  return [...new Set(keys)].sort();
}

describe("Ahmadi follow-up through createServer", () => {
  it("calls Hossein Ahmadi once when the answer arrives at +10 seconds", async () => {
    const { clock, say, calls, routerSeeds } = flow();

    await say(request);
    clock.advance(10_000);
    const response = await say("حسین");

    expect(response.json().status).toBe("succeeded");
    expect(calls).toEqual([{ tool: "call_contact", input: { contact: "حسین احمدی" } }]);
    expect(routerSeeds).toEqual([1, 3]);
  });

  it("treats the answer as a first request at +91 seconds", async () => {
    const { clock, say, calls, routerSeeds } = flow();

    await say(request);
    clock.advance(91_000);
    await say("حسین");

    expect(calls).toEqual([]);
    expect(routerSeeds).toEqual([1, 1]);
  });

  it("emits the same event types and fields as a first request", async () => {
    const firstRun = flow();
    await firstRun.say(request);
    const followRun = flow();
    await followRun.say(request);
    followRun.events.length = 0;
    followRun.clock.advance(10_000);

    await followRun.say("حسین");

    expect(shapes(followRun.events)).toEqual(shapes(firstRun.events));
  });
});
