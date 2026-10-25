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

  it.each([
    ["bigger", "extra-large"],
    ["smaller", "small"],
    ["slower", "0.75"],
    ["faster", "1.25"],
    ["longer wait", "2500"],
  ])("maps a relative %s request to %s", (phrase, value) => {
    const { system } = agentDefinitions.settings;

    expect(system).toContain(phrase);
    expect(system).toContain(value);
  });

  it("moves relative requests from the default toward the extreme", () => {
    expect(agentDefinitions.settings.system).toMatch(/default.*extreme|extreme.*default/i);
  });
});

describe("clock agent", () => {
  it("has a definition", () => {
    expect(agentDefinitions.clock).toBeDefined();
  });

  it("uses only the get_time tool", () => {
    expect(agentDefinitions.clock?.tools).toEqual(["get_time"]);
  });

  it("answers in the user's language and names no language", () => {
    const system = agentDefinitions.clock?.system ?? "";

    expect(system).toContain("the user's language");
    expect(system).not.toMatch(/farsi|persian|english|arabic/i);
  });

  it("states both time and day in one short sentence", () => {
    const system = agentDefinitions.clock?.system ?? "";

    expect(system).toMatch(/time and (the )?day/i);
    expect(system).toContain("one short sentence");
  });

  it("calls get_time first and takes values only from its result", () => {
    const system = agentDefinitions.clock?.system ?? "";

    expect(system).toContain("Call get_time first");
    expect(system).toMatch(/only from its result/i);
  });

  it("states no time or day when applied is false", () => {
    const system = agentDefinitions.clock?.system ?? "";

    expect(system).toContain("applied false");
    expect(system).toMatch(/state no time or day/i);
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

describe("comms call method", () => {
  it("defaults calls to WhatsApp and names the phone method", () => {
    expect(agentDefinitions.comms.system).toMatch(/WhatsApp/);
    expect(agentDefinitions.comms.system).toMatch(/via phone/);
  });
});
