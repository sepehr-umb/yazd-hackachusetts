import { describe, expect, it } from "vitest";
import type { LlmResponse } from "./llmClient";
import { createOrchestrator } from "./orchestrator";
import { createStubTools } from "./stubTools";
import { createRecordingEventBus } from "./testing/recordingEventBus";
import { createReplayLlmClient } from "./testing/replayLlmClient";
import { withSettings } from "../settings/withSettings";

const routeToSettings: LlmResponse = {
  stopReason: "tool_use",
  content: [
    { type: "tool_use", id: "toolu_route", name: "route_to_agent", input: { agent: "settings" } },
  ],
};

function updateSetting(input: Record<string, unknown>): LlmResponse {
  return {
    stopReason: "tool_use",
    content: [{ type: "tool_use", id: "toolu_update", name: "update_setting", input }],
  };
}

function say(text: string): LlmResponse {
  return { stopReason: "end_turn", content: [{ type: "text", text }] };
}

describe("orchestrator with the settings agent", () => {
  it("hands a request routed to settings to the settings agent", async () => {
    const llm = createReplayLlmClient([routeToSettings, say("done")]);
    const orchestrator = createOrchestrator({
      llm,
      tools: createStubTools().tools,
      bus: createRecordingEventBus(),
    });

    const result = await orchestrator.handle("speak slower");

    expect(result).toMatchObject({ status: "succeeded", agent: "settings" });
    expect(llm.requests[1]?.tools.map((tool) => tool.name)).toEqual([
      "update_setting",
      "reset_settings",
    ]);
  });

  it("speaks the model's reply and emits no setting_changed when the value is out of range", async () => {
    const reply = "Speech rate must be between 0.5 and 1.5.";
    const bus = createRecordingEventBus();
    const llm = createReplayLlmClient([
      routeToSettings,
      updateSetting({ name: "speechRate", value: 2 }),
      say(reply),
    ]);
    const orchestrator = createOrchestrator({
      llm,
      tools: withSettings(createStubTools().tools, bus),
      bus,
    });

    const result = await orchestrator.handle("speak much faster");

    expect(result).toEqual({ status: "succeeded", agent: "settings", reply });
    expect(bus.events).not.toContainEqual(expect.objectContaining({ type: "setting_changed" }));
    expect(bus.events).toContainEqual({ type: "tool_call", tool: "update_setting", status: "succeeded" });
    expect(bus.events.at(-1)).toEqual({ type: "state", state: "speaking" });
  });
});
