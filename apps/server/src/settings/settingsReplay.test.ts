import { describe, expect, it } from "vitest";
import type { LlmResponse } from "../orchestrator/llmClient";
import { createOrchestrator } from "../orchestrator/orchestrator";
import { createStubTools } from "../orchestrator/stubTools";
import { createRecordingEventBus } from "../orchestrator/testing/recordingEventBus";
import { createReplayLlmClient } from "../orchestrator/testing/replayLlmClient";
import type { RecordedConversation } from "../orchestrator/testing/replayLlmClient";
import resetSettings from "../orchestrator/fixtures/resetSettings.json";
import speakSlower from "../orchestrator/fixtures/speakSlower.json";
import { withSettings } from "./withSettings";

function lastText(conversation: RecordedConversation): string {
  const last = conversation.responses.at(-1) as LlmResponse;
  return last.content.map((block) => (block.type === "text" ? block.text : "")).join("");
}

describe("settings replay", () => {
  it("replays speak slower through the settings agent and lowers the speech rate", async () => {
    const conversation = speakSlower as RecordedConversation;
    const bus = createRecordingEventBus();
    const orchestrator = createOrchestrator({
      llm: createReplayLlmClient(conversation.responses),
      tools: withSettings(createStubTools().tools, bus),
      bus,
    });

    const result = await orchestrator.handle(conversation.transcript);

    expect(result).toEqual({
      status: "succeeded",
      agent: "settings",
      reply: lastText(conversation),
    });
    expect(bus.events).toContainEqual({ type: "setting_changed", name: "speechRate", value: 0.8 });
  });

  it("replays go back to normal through the settings agent and resets settings", async () => {
    const conversation = resetSettings as RecordedConversation;
    const bus = createRecordingEventBus();
    const orchestrator = createOrchestrator({
      llm: createReplayLlmClient(conversation.responses),
      tools: withSettings(createStubTools().tools, bus),
      bus,
    });

    const result = await orchestrator.handle(conversation.transcript);

    expect(result).toEqual({
      status: "succeeded",
      agent: "settings",
      reply: lastText(conversation),
    });
    expect(bus.events).toContainEqual({ type: "settings_reset" });
  });
});
