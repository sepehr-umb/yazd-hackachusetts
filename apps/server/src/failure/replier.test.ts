import { toolNames } from "@mahmood/contracts";
import type { RequestResult } from "@mahmood/contracts";
import { describeFailure, friendlyApology } from "@mahmood/strings";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { LlmClient, LlmResponse } from "../orchestrator";
import { spokenText } from "../speech/spokenText";
import { createReplier } from "./replier";

function fakeLlm(behavior: () => Promise<LlmResponse>) {
  const state = { calls: 0 };
  const llm: LlmClient = {
    complete: () => {
      state.calls += 1;
      return behavior();
    },
  };
  return { llm, state };
}

const textLlm = (text: string) =>
  fakeLlm(async () => ({ content: [{ type: "text", text }], stopReason: "end_turn" }));

const failure = { reason: "llm_error", message: "boom" } as const;
const failed: RequestResult = { status: "failed", failure };
const toolFailed: RequestResult = {
  status: "failed",
  failure: { reason: "tool_failed", tool: "send_message", error: "nope" },
};
const mentionsTool = (text: string) =>
  toolNames.some((name) => text.toLowerCase().includes(name.toLowerCase()));

describe("createReplier", () => {
  it("replies to succeeded and clarification like spokenText without calling the model", async () => {
    const { llm, state } = textLlm("unused");
    const replier = createReplier({ llm });
    const succeeded: RequestResult = { status: "succeeded", agent: "home", reply: "Light on." };
    const clarification: RequestResult = {
      status: "clarification",
      agent: "clarifier",
      question: "Which one?",
    };
    expect(await replier.reply(succeeded, "x")).toBe(spokenText(succeeded));
    expect(await replier.reply(clarification, "x")).toBe(spokenText(clarification));
    expect(state.calls).toBe(0);
  });

  it("uses a clean model text for a failed result", async () => {
    const { llm } = textLlm("Mi dispiace, riprova.");
    expect(await createReplier({ llm }).reply(failed, "chiama mamma")).toBe(
      "Mi dispiace, riprova.",
    );
  });

  it("falls back to the table when the model throws", async () => {
    const { llm } = fakeLlm(() => Promise.reject(new Error("down")));
    expect(await createReplier({ llm }).reply(failed, "chiama mamma")).toBe(
      friendlyApology(failure, "chiama mamma"),
    );
  });

  it("falls back to the table when the model times out", async () => {
    const { llm } = fakeLlm(() => new Promise<LlmResponse>(() => undefined));
    const reply = await createReplier({ llm, timeoutMs: 10 }).reply(failed, "chiama mamma");
    expect(reply).toBe(friendlyApology(failure, "chiama mamma"));
  });

  it("falls back to the table when the model returns empty text", async () => {
    const { llm } = textLlm("   ");
    expect(await createReplier({ llm }).reply(failed, "hello")).toBe(
      friendlyApology(failure, "hello"),
    );
  });

  it("falls back to the table when the model leaks a tool name in any case", async () => {
    const { llm } = textLlm("Sorry, SEND_MESSAGE broke");
    expect(await createReplier({ llm }).reply(toolFailed, "hello")).toBe(
      friendlyApology(toolFailed.status === "failed" ? toolFailed.failure : failure, "hello"),
    );
  });

  it("falls back to the table when the model repeats the describeFailure text", async () => {
    const text = describeFailure(failure);
    const { llm } = textLlm(`Oops. ${text}`);
    expect(await createReplier({ llm }).reply(failed, "hello")).toBe(
      friendlyApology(failure, "hello"),
    );
  });

  it("goes straight to the table without a model, in the request language", async () => {
    const replier = createReplier({});
    expect(await replier.reply(failed, "chiama mamma")).toBe(
      friendlyApology(failure, "chiama mamma"),
    );
    expect(await replier.reply(failed, "به احمدی زنگ بزن")).toBe(
      friendlyApology(failure, "به احمدی زنگ بزن"),
    );
    expect(await replier.reply(failed, "chiama mamma")).not.toBe(
      await replier.reply(failed, "call mom"),
    );
  });

  it("never returns empty text or a tool name for any model output", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.string(),
          fc.constantFrom(...toolNames),
          fc.tuple(fc.string(), fc.constantFrom(...toolNames), fc.string()).map((p) => p.join("")),
        ),
        async (output) => {
          const { llm } = textLlm(output);
          const reply = await createReplier({ llm }).reply(toolFailed, "hello");
          expect(reply.length).toBeGreaterThan(0);
          expect(mentionsTool(reply)).toBe(false);
        },
      ),
    );
  });
});
