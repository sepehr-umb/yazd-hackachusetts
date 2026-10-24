import type { RequestResult } from "@mahmood/contracts";
import { describe, expect, it } from "vitest";
import { spokenText } from "./spokenText";

type SpokenResult = Extract<RequestResult, { status: "succeeded" | "clarification" }>;

describe("spokenText", () => {
  it.each<[SpokenResult, string]>([
    [{ status: "succeeded", agent: "comms", reply: "دارم زنگ می‌زنم" }, "دارم زنگ می‌زنم"],
    [
      { status: "clarification", agent: "clarifier", question: "کدام را روشن کنم؟" },
      "کدام را روشن کنم؟",
    ],
  ])("speaks %j as %j", (result, text) => {
    expect(spokenText(result)).toBe(text);
  });
});
