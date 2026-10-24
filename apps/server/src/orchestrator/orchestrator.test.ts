import { describe, expect, it } from "vitest";
import type { LlmRequest, LlmResponse } from "./llmClient";
import { createOrchestrator } from "./orchestrator";
import { createStubTools } from "./stubTools";
import { createRecordingEventBus } from "./testing/recordingEventBus";
import { createReplayLlmClient } from "./testing/replayLlmClient";
import type { RecordedConversation } from "./testing/replayLlmClient";
import callMom from "./fixtures/callMom.json";
import ambiguousTurnOn from "./fixtures/ambiguousTurnOn.json";
import lightOn from "./fixtures/lightOn.json";
import pauseTv from "./fixtures/pauseTv.json";
import unroutable from "./fixtures/unroutable.json";

function lastText(conversation: RecordedConversation): string {
  const last = conversation.responses.at(-1) as LlmResponse;
  return last.content.map((block) => (block.type === "text" ? block.text : "")).join("");
}

describe("orchestrator", () => {
  it("routes a call request to comms and calls the contact", async () => {
    const conversation = callMom as RecordedConversation;
    const { tools, calls } = createStubTools();
    const orchestrator = createOrchestrator({
      llm: createReplayLlmClient(conversation.responses),
      tools,
      bus: createRecordingEventBus(),
    });

    const result = await orchestrator.handle(conversation.transcript);

    expect(result).toEqual({ status: "succeeded", agent: "comms", reply: lastText(conversation) });
    expect(calls).toEqual([{ tool: "call_contact", input: { contact: "مامان" } }]);
  });

  it("emits state, agent and tool call events in order", async () => {
    const conversation = callMom as RecordedConversation;
    const bus = createRecordingEventBus();
    const orchestrator = createOrchestrator({
      llm: createReplayLlmClient(conversation.responses),
      tools: createStubTools().tools,
      bus,
    });

    await orchestrator.handle(conversation.transcript);

    expect(bus.events).toEqual([
      { type: "state", state: "thinking" },
      { type: "agent", agent: "orchestrator" },
      { type: "agent", agent: "comms" },
      { type: "tool_call", tool: "call_contact", status: "started" },
      { type: "tool_call", tool: "call_contact", status: "succeeded" },
      { type: "state", state: "speaking" },
    ]);
  });

  it("routes a light request to home and sets the light", async () => {
    const conversation = lightOn as RecordedConversation;
    const { tools, calls } = createStubTools();
    const orchestrator = createOrchestrator({
      llm: createReplayLlmClient(conversation.responses),
      tools,
      bus: createRecordingEventBus(),
    });

    const result = await orchestrator.handle(conversation.transcript);

    expect(result).toEqual({ status: "succeeded", agent: "home", reply: lastText(conversation) });
    expect(calls).toEqual([{ tool: "set_light", input: { room: "اتاق خواب", on: true } }]);
  });

  it("routes an ambiguous request to the clarifier and returns its question", async () => {
    const conversation = ambiguousTurnOn as RecordedConversation;
    const llm = createReplayLlmClient(conversation.responses);
    const { tools, calls } = createStubTools();
    const orchestrator = createOrchestrator({ llm, tools, bus: createRecordingEventBus() });

    const result = await orchestrator.handle(conversation.transcript);

    expect(result).toEqual({
      status: "clarification",
      agent: "clarifier",
      question: "کدام را روشن کنم؟ چراغ یا تلویزیون؟",
    });
    expect(calls).toEqual([
      {
        tool: "ask_for_clarification",
        input: { question: "کدام را روشن کنم؟ چراغ یا تلویزیون؟" },
      },
    ]);
    expect(llm.requests).toHaveLength(2);
  });

  it("routes a TV request to media and controls playback", async () => {
    const conversation = pauseTv as RecordedConversation;
    const { tools, calls } = createStubTools();
    const orchestrator = createOrchestrator({
      llm: createReplayLlmClient(conversation.responses),
      tools,
      bus: createRecordingEventBus(),
    });

    const result = await orchestrator.handle(conversation.transcript);

    expect(result).toEqual({ status: "succeeded", agent: "media", reply: lastText(conversation) });
    expect(calls).toEqual([{ tool: "media_control", input: { action: "pause" } }]);
  });

  it("offers the router all four agents and each agent only its own tools", async () => {
    const conversation = callMom as RecordedConversation;
    const llm = createReplayLlmClient(conversation.responses);
    const orchestrator = createOrchestrator({
      llm,
      tools: createStubTools().tools,
      bus: createRecordingEventBus(),
    });

    await orchestrator.handle(conversation.transcript);

    const [routing, comms] = llm.requests;
    expect(routing?.tools.map((tool) => tool.name)).toEqual(["route_to_agent"]);
    expect(routing?.tools[0]?.inputSchema).toMatchObject({
      properties: { agent: { enum: ["comms", "home", "media", "settings", "clock", "clarifier"] } },
    });
    expect(comms?.tools.map((tool) => tool.name)).toEqual(["call_contact", "send_message"]);
  });

  describe("when a tool fails", () => {
    async function runFailingCall() {
      const conversation = callMom as RecordedConversation;
      const llm = createReplayLlmClient(conversation.responses);
      const bus = createRecordingEventBus();
      const { tools } = createStubTools({ failures: { call_contact: "no network" } });
      const orchestrator = createOrchestrator({ llm, tools, bus });
      const result = await orchestrator.handle(conversation.transcript);
      return { result, llm, bus, conversation };
    }

    it("returns a failure result naming the tool and error", async () => {
      const { result } = await runFailingCall();

      expect(result).toEqual({
        status: "failed",
        agent: "comms",
        failure: { reason: "tool_failed", tool: "call_contact", error: "no network" },
      });
    });

    it("never relays the model's success message", async () => {
      const { result, conversation } = await runFailingCall();

      expect(JSON.stringify(result)).not.toContain(lastText(conversation));
    });

    it("does not ask the model to narrate after the failure", async () => {
      const { llm } = await runFailingCall();

      expect(llm.requests).toHaveLength(2);
    });

    it("emits a failed tool call and the error state, never success", async () => {
      const { bus } = await runFailingCall();

      expect(bus.events).toEqual([
        { type: "state", state: "thinking" },
        { type: "agent", agent: "orchestrator" },
        { type: "agent", agent: "comms" },
        { type: "tool_call", tool: "call_contact", status: "started" },
        { type: "tool_call", tool: "call_contact", status: "failed" },
        { type: "state", state: "error" },
      ]);
    });
  });

  describe("when execution goes wrong", () => {
    function callMomRequestingTool(toolName: string): RecordedConversation {
      const conversation = structuredClone(callMom) as RecordedConversation;
      const toolUse = conversation.responses[1]?.content[0];
      if (toolUse?.type === "tool_use") toolUse.name = toolName;
      return conversation;
    }

    it.each(["set_light", "launch_missiles"])(
      "refuses to run %s for the comms agent and fails",
      async (toolName) => {
        const conversation = callMomRequestingTool(toolName);
        const { tools, calls } = createStubTools();
        const bus = createRecordingEventBus();
        const orchestrator = createOrchestrator({
          llm: createReplayLlmClient(conversation.responses),
          tools,
          bus,
        });

        const result = await orchestrator.handle(conversation.transcript);

        expect(result).toEqual({
          status: "failed",
          agent: "comms",
          failure: { reason: "invalid_tool_call", tool: toolName },
        });
        expect(calls).toEqual([]);
        expect(bus.events.at(-1)).toEqual({ type: "state", state: "error" });
        expect(bus.events).not.toContainEqual(expect.objectContaining({ type: "tool_call" }));
      },
    );

    describe("tool input validation", () => {
      function callMomWithInput(toolName: string, input: Record<string, unknown>) {
        const conversation = structuredClone(callMom) as RecordedConversation;
        const toolUse = conversation.responses[1]?.content[0];
        if (toolUse?.type === "tool_use") {
          toolUse.name = toolName;
          toolUse.input = input;
        }
        return conversation;
      }

      it.each([
        ["a required field is missing", "call_contact", {}],
        ["a field has the wrong type", "call_contact", { contact: 42 }],
      ])(
        "fails with invalid_tool_call and never runs the tool when %s",
        async (_why, name, input) => {
          const conversation = callMomWithInput(name, input);
          const { tools, calls } = createStubTools();
          const bus = createRecordingEventBus();
          const orchestrator = createOrchestrator({
            llm: createReplayLlmClient(conversation.responses),
            tools,
            bus,
          });

          const result = await orchestrator.handle(conversation.transcript);

          expect(result).toEqual({
            status: "failed",
            agent: "comms",
            failure: { reason: "invalid_tool_call", tool: name },
          });
          expect(calls).toEqual([]);
          expect(bus.events.at(-1)).toEqual({ type: "state", state: "error" });
        },
      );
    });

    describe("step cap", () => {
      function endlessCallConversation(toolTurns: number): LlmResponse[] {
        const callMomConversation = callMom as RecordedConversation;
        const [routing, toolTurn] = callMomConversation.responses as [LlmResponse, LlmResponse];
        const finalReply = callMomConversation.responses.at(-1) as LlmResponse;
        return [routing, ...Array.from({ length: toolTurns }, () => toolTurn), finalReply];
      }

      it("fails with too_many_steps on the sixth tool-use turn without running it", async () => {
        const { tools, calls } = createStubTools();
        const bus = createRecordingEventBus();
        const orchestrator = createOrchestrator({
          llm: createReplayLlmClient(endlessCallConversation(6)),
          tools,
          bus,
        });

        const result = await orchestrator.handle("به مامان زنگ بزن");

        expect(result).toEqual({
          status: "failed",
          agent: "comms",
          failure: { reason: "too_many_steps" },
        });
        expect(calls).toHaveLength(5);
        expect(bus.events.at(-1)).toEqual({ type: "state", state: "error" });
      });

      it("still succeeds when the fifth tool-use turn is the last", async () => {
        const orchestrator = createOrchestrator({
          llm: createReplayLlmClient(endlessCallConversation(5)),
          tools: createStubTools().tools,
          bus: createRecordingEventBus(),
        });

        const result = await orchestrator.handle("به مامان زنگ بزن");

        expect(result.status).toBe("succeeded");
      });
    });

    it("treats a throwing tool as a failed tool", async () => {
      const conversation = callMom as RecordedConversation;
      const bus = createRecordingEventBus();
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
        llm: createReplayLlmClient(conversation.responses),
        tools,
        bus,
      });

      const result = await orchestrator.handle(conversation.transcript);

      expect(result).toEqual({
        status: "failed",
        agent: "comms",
        failure: { reason: "tool_failed", tool: "call_contact", error: "device shell crashed" },
      });
      expect(bus.events.slice(-2)).toEqual([
        { type: "tool_call", tool: "call_contact", status: "failed" },
        { type: "state", state: "error" },
      ]);
    });

    it("fails when the model picks no valid agent", async () => {
      const conversation = unroutable as RecordedConversation;
      const bus = createRecordingEventBus();
      const { tools, calls } = createStubTools();
      const orchestrator = createOrchestrator({
        llm: createReplayLlmClient(conversation.responses),
        tools,
        bus,
      });

      const result = await orchestrator.handle(conversation.transcript);

      expect(result).toEqual({ status: "failed", failure: { reason: "unroutable" } });
      expect(calls).toEqual([]);
      expect(bus.events).toEqual([
        { type: "state", state: "thinking" },
        { type: "agent", agent: "orchestrator" },
        { type: "state", state: "error" },
      ]);
    });

    it.each([
      ["while routing", 0],
      ["while the sub-agent is working", 1],
    ])("fails when the LLM errors %s", async (_when, failingCall) => {
      const conversation = callMom as RecordedConversation;
      const replay = createReplayLlmClient(conversation.responses);
      const llm = {
        async complete(request: LlmRequest) {
          if (replay.requests.length === failingCall) throw new Error("rate limited");
          return replay.complete(request);
        },
      };
      const bus = createRecordingEventBus();
      const { tools, calls } = createStubTools();
      const orchestrator = createOrchestrator({ llm, tools, bus });

      const result = await orchestrator.handle(conversation.transcript);

      expect(result).toMatchObject({
        status: "failed",
        failure: { reason: "llm_error", message: "rate limited" },
      });
      expect(calls).toEqual([]);
      expect(bus.events.at(-1)).toEqual({ type: "state", state: "error" });
    });

    it("fails instead of speaking an empty clarification", async () => {
      const conversation = ambiguousTurnOn as RecordedConversation;
      const tools = {
        ...createStubTools().tools,
        ask_for_clarification: {
          name: "ask_for_clarification" as const,
          execute: async () => ({ ok: true as const }),
        },
      };
      const orchestrator = createOrchestrator({
        llm: createReplayLlmClient(conversation.responses),
        tools,
        bus: createRecordingEventBus(),
      });

      const result = await orchestrator.handle(conversation.transcript);

      expect(result).toEqual({
        status: "failed",
        agent: "clarifier",
        failure: {
          reason: "tool_failed",
          tool: "ask_for_clarification",
          error: "No question returned",
        },
      });
    });
  });
});
