import type { ToolResult } from "@mahmood/contracts";
import { describe, expect, it } from "vitest";
import clockConversation from "../orchestrator/fixtures/clock.json";
import { createOrchestrator } from "../orchestrator/orchestrator";
import { createStubTools } from "../orchestrator/stubTools";
import { createRecordingEventBus } from "../orchestrator/testing/recordingEventBus";
import { createReplayLlmClient } from "../orchestrator/testing/replayLlmClient";
import type { RecordedConversation } from "../orchestrator/testing/replayLlmClient";
import type { Clock } from "./clock";
import { withClock } from "./withClock";

const fakeClock: Clock = { now: () => new Date(2024, 0, 15, 14, 5, 30) };

function setup() {
  const conversation = clockConversation as RecordedConversation;
  const bus = createRecordingEventBus();
  const tools = withClock(createStubTools().tools, fakeClock);
  const results: ToolResult[] = [];
  const observed = {
    ...tools,
    get_time: {
      ...tools.get_time,
      async execute(input: Record<string, unknown>) {
        const result = await tools.get_time.execute(input);
        results.push(result);
        return result;
      },
    },
  };
  const orchestrator = createOrchestrator({
    llm: createReplayLlmClient(conversation.responses),
    tools: observed,
    bus,
  });
  return { conversation, bus, orchestrator, results };
}

describe("clock replay", () => {
  it("routes to the clock agent exactly once", async () => {
    const { conversation, bus, orchestrator } = setup();

    const result = await orchestrator.handle(conversation.transcript);

    expect(result).toMatchObject({ status: "succeeded", agent: "clock" });
    expect(bus.events.filter((event) => event.type === "agent" && event.agent === "clock")).toEqual([
      { type: "agent", agent: "clock" },
    ]);
  });

  it("emits get_time started followed by succeeded", async () => {
    const { conversation, bus, orchestrator } = setup();

    await orchestrator.handle(conversation.transcript);

    const statuses = bus.events
      .filter((event) => event.type === "tool_call" && event.tool === "get_time")
      .map((event) => (event.type === "tool_call" ? event.status : undefined));
    expect(statuses).toEqual(["started", "succeeded"]);
  });

  it("gives the get_time result the fake clock hour, minute, and weekday", async () => {
    const { conversation, orchestrator, results } = setup();

    await orchestrator.handle(conversation.transcript);

    expect(results).toEqual([
      { ok: true, output: { applied: true, hour: 14, minute: 5, weekday: "Monday" } },
    ]);
  });
});
