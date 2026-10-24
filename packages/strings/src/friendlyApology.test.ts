import type { RequestFailure } from "@mahmood/contracts";
import { toolNames } from "@mahmood/contracts";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { apologies, friendlyApology } from "./friendlyApology";
import { describeFailure } from "./describeFailure";

const reasons: RequestFailure["reason"][] = [
  "llm_error",
  "too_many_steps",
  "unroutable",
  "invalid_tool_call",
  "tool_failed",
];
const languages = ["fa", "ar", "it", "en"] as const;

const failureFor = (
  reason: RequestFailure["reason"],
  tool: (typeof toolNames)[number],
): RequestFailure => {
  switch (reason) {
    case "tool_failed":
      return { reason, tool, error: "boom" };
    case "invalid_tool_call":
      return { reason, tool };
    case "llm_error":
      return { reason, message: "boom" };
    default:
      return { reason };
  }
};

describe("friendlyApology", () => {
  it("answers an LLM failure in each language", () => {
    const failure: RequestFailure = { reason: "llm_error", message: "down" };
    expect(friendlyApology(failure, "chiama mamma")).toBe(
      "Mi dispiace, non ci sono riuscito. Riprova tra poco.",
    );
    expect(friendlyApology(failure, "turn on the light")).toBe(apologies.llm_error.en);
    expect(friendlyApology(failure, "به احمدی زنگ بزن")).toBe(apologies.llm_error.fa);
    expect(friendlyApology(failure, "شغل التلفاز يا ولدي")).toBe(apologies.llm_error.ar);
  });

  it("has a non-empty entry for every reason and language", () => {
    expect(Object.keys(apologies).sort()).toEqual([...reasons].sort());
    for (const reason of reasons) {
      for (const language of languages) {
        expect(apologies[reason][language].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it.each(reasons.flatMap((reason) => languages.map((language) => [reason, language] as const)))(
    "uses the preferred language for letterless text: %s %s",
    (reason, language) => {
      const failure = failureFor(reason, toolNames[0]);
      expect(friendlyApology(failure, "..", language)).toBe(apologies[reason][language]);
      expect(friendlyApology(failure, "؟", language)).toBe(apologies[reason][language]);
    },
  );

  it("uses detection for letterless text when the preference is unsupported or absent", () => {
    const failure: RequestFailure = { reason: "llm_error", message: "down" };
    expect(friendlyApology(failure, "..", "fr")).toBe(apologies.llm_error.en);
    expect(friendlyApology(failure, "..")).toBe(apologies.llm_error.en);
    expect(friendlyApology(failure, "..", undefined)).toBe(apologies.llm_error.en);
  });

  it("ignores the preferred language when the text has letters", () => {
    const failure: RequestFailure = { reason: "llm_error", message: "down" };
    expect(friendlyApology(failure, "hello", "fa")).toBe(apologies.llm_error.en);
    expect(friendlyApology(failure, "به احمدی زنگ بزن", "en")).toBe(apologies.llm_error.fa);
  });

  it("never leaks a tool name or failure text", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...reasons),
        fc.constantFrom(...toolNames),
        fc.string(),
        (reason, tool, text) => {
          const failure = failureFor(reason, tool);
          const reply = friendlyApology(failure, text);
          expect(reply.length).toBeGreaterThan(0);
          expect(reply).not.toContain(describeFailure(failure));
          for (const name of toolNames) {
            expect(reply.toLowerCase()).not.toContain(name.toLowerCase());
          }
        },
      ),
    );
  });
});
