import { describe, expect, it } from "vitest";
import { agentDefinitions } from "./agents";
import { createOrchestrator } from "./orchestrator";
import type { SubAgentName } from "./result";
import { createStubTools } from "./stubTools";
import { toolSchemas } from "./toolSchemas";
import { createRecordingEventBus } from "./testing/recordingEventBus";
import { createReplayLlmClient } from "./testing/replayLlmClient";
import type { RecordedConversation } from "./testing/replayLlmClient";
import callMom from "./fixtures/callMom.json";

describe("agent prompts", () => {
  it.each(Object.keys(agentDefinitions) as SubAgentName[])(
    "%s answers in the user's language and never names Farsi",
    (agent) => {
      const { system } = agentDefinitions[agent];

      expect(system).toContain("the user's language");
      expect(system).not.toMatch(/farsi/i);
    },
  );
});

describe("settings agent", () => {
  it("has a definition", () => {
    expect(agentDefinitions.settings).toBeDefined();
  });

  it("uses the update and reset tools", () => {
    expect(agentDefinitions.settings.tools).toEqual(["update_setting", "reset_settings"]);
  });

  it("asks for absolute values and a question when details are missing", () => {
    const { system } = agentDefinitions.settings;

    expect(system).toMatch(/absolute/i);
    expect(system).toMatch(/question/i);
    expect(system).toMatch(/current value/i);
  });
});

describe("router prompt and tool descriptions", () => {
  it("never name Farsi", async () => {
    const conversation = callMom as RecordedConversation;
    const llm = createReplayLlmClient(conversation.responses);
    const orchestrator = createOrchestrator({
      llm,
      tools: createStubTools().tools,
      bus: createRecordingEventBus(),
    });

    await orchestrator.handle(conversation.transcript);

    const routerSystem = llm.requests[0]?.system ?? "";
    const descriptions = Object.values(toolSchemas).map((schema) => schema.description);
    expect([routerSystem, ...descriptions].join("\n")).not.toMatch(/farsi/i);
  });
});
