import type { RequestResult } from "@mahmood/contracts";
import { describe, expect, it } from "vitest";
import { spokenText } from "./spokenText";

describe("spokenText", () => {
  it.each<[RequestResult, string]>([
    [{ status: "succeeded", agent: "comms", reply: "دارم زنگ می‌زنم" }, "دارم زنگ می‌زنم"],
    [
      { status: "clarification", agent: "clarifier", question: "کدام را روشن کنم؟" },
      "کدام را روشن کنم؟",
    ],
    [
      { status: "failed", failure: { reason: "llm_error", message: "model overloaded" } },
      "model overloaded",
    ],
    [
      {
        status: "failed",
        agent: "comms",
        failure: { reason: "tool_failed", tool: "call_contact", error: "No contact matches" },
      },
      "call_contact failed: No contact matches",
    ],
    [
      { status: "failed", failure: { reason: "unroutable" } },
      "The assistant does not know how to help with that",
    ],
  ])("speaks %j as %j", (result, text) => {
    expect(spokenText(result)).toBe(text);
  });
});
