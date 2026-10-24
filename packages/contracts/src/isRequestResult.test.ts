import { describe, expect, it } from "vitest";
import { isRequestResult } from "./index";

describe("isRequestResult", () => {
  it("accepts a succeeded result", () => {
    expect(isRequestResult({ status: "succeeded", agent: "comms", reply: "دارم زنگ می‌زنم" })).toBe(
      true,
    );
  });

  it("accepts a clarification result", () => {
    expect(
      isRequestResult({ status: "clarification", agent: "clarifier", question: "کدام یک؟" }),
    ).toBe(true);
  });

  it("accepts a failed result with and without an agent", () => {
    const failure = { reason: "tool_failed", tool: "call_contact", error: "no network" };
    expect(isRequestResult({ status: "failed", agent: "comms", failure })).toBe(true);
    expect(isRequestResult({ status: "failed", failure: { reason: "unroutable" } })).toBe(true);
  });

  it.each([
    [null],
    ["succeeded"],
    [{}],
    [{ status: "paused" }],
    [{ status: "succeeded", agent: "comms" }],
    [{ status: "succeeded", agent: "banker", reply: "hi" }],
    [{ status: "clarification", agent: "clarifier" }],
    [{ status: "failed" }],
    [{ status: "failed", failure: { reason: 7 } }],
  ])("rejects %j", (value) => {
    expect(isRequestResult(value)).toBe(false);
  });
});
