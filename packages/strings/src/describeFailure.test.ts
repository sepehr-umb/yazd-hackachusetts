import { toolNames } from "@mahmood/contracts";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { describeFailure } from "./describeFailure";

describe("describeFailure", () => {
  it("describes a failed tool with its name and error", () => {
    fc.assert(
      fc.property(fc.constantFrom(...toolNames), fc.string(), (tool, error) => {
        expect(describeFailure({ reason: "tool_failed", tool, error })).toBe(
          `${tool} failed: ${error}`,
        );
      }),
    );
  });

  it("describes an invalid tool call with the requested name", () => {
    fc.assert(
      fc.property(fc.string(), (tool) => {
        expect(describeFailure({ reason: "invalid_tool_call", tool })).toBe(
          `The assistant asked for an action it cannot do: ${tool}`,
        );
      }),
    );
  });

  it("describes a model error with its message", () => {
    fc.assert(
      fc.property(fc.string(), (message) => {
        expect(describeFailure({ reason: "llm_error", message })).toBe(
          `The language model failed: ${message}`,
        );
      }),
    );
  });

  it("keeps the fixed sentences for too many steps and unroutable", () => {
    expect(describeFailure({ reason: "too_many_steps" })).toBe("The assistant took too many steps");
    expect(describeFailure({ reason: "unroutable" })).toBe(
      "The assistant does not know how to help with that",
    );
  });
});
