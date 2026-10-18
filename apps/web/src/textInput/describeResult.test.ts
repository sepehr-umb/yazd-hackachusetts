import type { RequestResult } from "@mahmood/contracts";
import { describe, expect, it } from "vitest";
import { describeResult } from "./describeResult";

describe("describeResult", () => {
  it.each<[RequestResult, string, string]>([
    [
      { status: "succeeded", agent: "comms", reply: "دارم زنگ می‌زنم" },
      "دارم زنگ می‌زنم",
      "neutral",
    ],
    [
      { status: "clarification", agent: "clarifier", question: "کدام را روشن کنم؟" },
      "کدام را روشن کنم؟",
      "neutral",
    ],
    [
      {
        status: "failed",
        agent: "comms",
        failure: { reason: "tool_failed", tool: "call_contact", error: "No contact matches" },
      },
      "call_contact failed: No contact matches",
      "error",
    ],
    [
      { status: "failed", failure: { reason: "invalid_tool_call", tool: "rm_rf" } },
      "The assistant asked for an action it cannot do: rm_rf",
      "error",
    ],
    [
      { status: "failed", failure: { reason: "too_many_steps" } },
      "The assistant took too many steps",
      "error",
    ],
    [
      { status: "failed", failure: { reason: "unroutable" } },
      "The assistant does not know how to help with that",
      "error",
    ],
    [
      { status: "failed", failure: { reason: "llm_error", message: "401 unauthorized" } },
      "The language model failed: 401 unauthorized",
      "error",
    ],
  ])("describes %j as %j", (result, text, tone) => {
    expect(describeResult(result)).toEqual({ text, tone });
  });
});
