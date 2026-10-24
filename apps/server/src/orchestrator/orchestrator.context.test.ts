import { describe, expect, it } from "vitest";
import { agentDefinitions } from "./agents";
import type { LlmResponse } from "./llmClient";
import { MAX_TOOL_TURNS } from "./runSubAgent";
import { createOrchestrator } from "./orchestrator";
import type { ToolSet } from "./tool";
import { createStubTools } from "./stubTools";
import { createRecordingEventBus } from "./testing/recordingEventBus";
import { createReplayLlmClient } from "./testing/replayLlmClient";

const history = { request: "به احمدی زنگ بزن", question: "حسین احمدی یا حسن احمدی؟" };

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

function toolsReturning(output: Record<string, unknown>): ToolSet {
  const { tools } = createStubTools();
  return { ...tools, call_contact: { name: "call_contact", execute: async () => ({ ok: true, output }) } };
}

function build(responses: LlmResponse[], tools: ToolSet = createStubTools().tools) {
  const llm = createReplayLlmClient(responses);
  return { llm, orchestrator: createOrchestrator({ llm, tools, bus: createRecordingEventBus() }) };
}

describe("orchestrator follow-up seed", () => {
  it("gives the router and the sub-agent three messages", async () => {
    const { llm, orchestrator } = build([routeTo("comms"), say("ok")]);

    await orchestrator.handle("حسین", { history });

    expect(llm.requests[0]?.messages).toHaveLength(3);
    expect(llm.requests[1]?.messages).toHaveLength(3);
    expect(llm.requests[1]?.messages[0]).toEqual({ role: "user", content: history.request });
    expect(llm.requests[1]?.messages[2]).toEqual({ role: "user", content: "حسین" });
  });

  it("keeps the router prompt unchanged with one message and extends it with more", async () => {
    const first = build([routeTo("comms"), say("ok")]);
    const followUp = build([routeTo("comms"), say("ok")]);

    await first.orchestrator.handle("hello");
    await followUp.orchestrator.handle("hello", { history });

    const base = first.llm.requests[0]?.system ?? "";
    const extended = followUp.llm.requests[0]?.system ?? "";
    expect(extended.startsWith(base)).toBe(true);
    expect(extended.length).toBeGreaterThan(base.length);
  });

  it("still stops after MAX_TOOL_TURNS tool turns with history", async () => {
    const loops = Array.from({ length: MAX_TOOL_TURNS + 1 }, () =>
      callTool("call_contact", { contact: "حسین احمدی" }),
    );
    const { orchestrator } = build([routeTo("comms"), ...loops]);

    const result = await orchestrator.handle("حسین", { history });

    expect(MAX_TOOL_TURNS).toBe(5);
    expect(result).toMatchObject({ status: "failed", failure: { reason: "too_many_steps" } });
  });
});

describe("orchestrator language option", () => {
  it("reaches the sub-agent system prompt and not the router prompt", async () => {
    const { llm, orchestrator } = build([routeTo("comms"), say("ok")]);

    await orchestrator.handle("xqzv", { language: "fa" });

    const sentence =
      "Reply in the language the user spoke. If you cannot tell which language that is, reply in fa.";
    expect(llm.requests[1]?.system).toBe(`${agentDefinitions.comms.system} ${sentence}`);
    expect(llm.requests[0]?.system).not.toContain(sentence);
  });

  it("leaves the sub-agent system prompt unchanged without a language", async () => {
    const { llm, orchestrator } = build([routeTo("comms"), say("ok")]);

    await orchestrator.handle("hello");

    expect(llm.requests[1]?.system).toBe(agentDefinitions.comms.system);
  });
});

describe("orchestrator onQuestion", () => {
  const choices = { applied: false, closest: ["حسین احمدی", "حسن احمدی"] };

  async function questions(responses: LlmResponse[], tools?: ToolSet): Promise<number> {
    let count = 0;
    const { orchestrator } = build(responses, tools);
    await orchestrator.handle("به احمدی زنگ بزن", { onQuestion: () => (count += 1) });
    return count;
  }

  it("fires for ask_for_clarification", async () => {
    const count = await questions([
      routeTo("clarifier"),
      callTool("ask_for_clarification", { question: "Which one?" }),
    ]);

    expect(count).toBe(1);
  });

  it("fires for a final reply after a tool result that offers choices", async () => {
    const count = await questions(
      [routeTo("comms"), callTool("call_contact", { contact: "احمدی" }), say("کدام؟")],
      toolsReturning(choices),
    );

    expect(count).toBe(1);
  });

  it.each([
    ["success", { applied: true }],
    ["applied false without closest", { applied: false }],
  ])("does not fire for %s", async (_name, output) => {
    const count = await questions(
      [routeTo("comms"), callTool("call_contact", { contact: "احمدی" }), say("done")],
      toolsReturning(output),
    );

    expect(count).toBe(0);
  });

  it("does not fire for a failure", async () => {
    const count = await questions(
      [routeTo("comms"), callTool("call_contact", { contact: "احمدی" })],
      createStubTools({ failures: { call_contact: "down" } }).tools,
    );

    expect(count).toBe(0);
  });
});
