import { describe, expect, it } from "vitest";
import type { LlmResponse } from "./llmClient";
import { agentDefinitions } from "./agents";
import { createOrchestrator } from "./orchestrator";
import { createStubTools } from "./stubTools";
import { createRecordingEventBus } from "./testing/recordingEventBus";
import { createReplayLlmClient } from "./testing/replayLlmClient";

function routeTo(agent: string): LlmResponse {
  return {
    stopReason: "tool_use",
    content: [{ type: "tool_use", id: "toolu_route", name: "route_to_agent", input: { agent } }],
  };
}

function say(text: string): LlmResponse {
  return { stopReason: "end_turn", content: [{ type: "text", text }] };
}

function callTool(name: string, input: Record<string, unknown>): LlmResponse {
  return { stopReason: "tool_use", content: [{ type: "tool_use", id: "toolu_call", name, input }] };
}

const routeToClock = routeTo("clock");

function subAgentEvents(events: readonly unknown[]) {
  return events.filter(
    (event) =>
      (event as { type: string }).type === "agent" &&
      (event as { agent: string }).agent !== "orchestrator",
  );
}

describe("orchestrator with the clock agent", () => {
  it("runs only the clock agent when the routing response names clock", async () => {
    const llm = createReplayLlmClient([routeToClock, say("done")]);
    const bus = createRecordingEventBus();
    const orchestrator = createOrchestrator({ llm, tools: createStubTools().tools, bus });

    const result = await orchestrator.handle("ساعت چنده؟");

    expect(result).toMatchObject({ status: "succeeded", agent: "clock" });
    expect(llm.requests).toHaveLength(2);
    expect(llm.requests[1]?.system).toBe(agentDefinitions.clock.system);
    expect(subAgentEvents(bus.events)).toEqual([{ type: "agent", agent: "clock" }]);
  });

  it("runs only the clarifier when the routing response names clarifier for a mixed request", async () => {
    const question = "Which one first?";
    const llm = createReplayLlmClient([
      routeTo("clarifier"),
      callTool("ask_for_clarification", { question }),
    ]);
    const bus = createRecordingEventBus();
    const orchestrator = createOrchestrator({ llm, tools: createStubTools().tools, bus });

    const result = await orchestrator.handle("what time is it and turn on the light");

    expect(result).toMatchObject({ status: "clarification", agent: "clarifier", question });
    expect(subAgentEvents(bus.events)).toEqual([{ type: "agent", agent: "clarifier" }]);
  });

  it.each(["call_contact", "launch_missiles"])(
    "rejects %s as a tool the clock agent did not declare and runs nothing",
    async (toolName) => {
      const { tools, calls } = createStubTools();
      const bus = createRecordingEventBus();
      const orchestrator = createOrchestrator({
        llm: createReplayLlmClient([routeToClock, callTool(toolName, { contact: "مامان" })]),
        tools,
        bus,
      });

      const result = await orchestrator.handle("ساعت چنده؟");

      expect(result).toEqual({
        status: "failed",
        agent: "clock",
        failure: { reason: "invalid_tool_call", tool: toolName },
      });
      expect(calls).toEqual([]);
      expect(bus.events).not.toContainEqual(expect.objectContaining({ type: "tool_call" }));
    },
  );
});
