import type { RequestResult, SubAgentName } from "@mahmood/contracts";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { spokenText } from "./spokenText";

const agents: SubAgentName[] = ["comms", "home", "media", "settings", "clock"];

describe("spokenText on replies and questions", () => {
  it("returns the agent reply exactly for any succeeded result", () => {
    fc.assert(
      fc.property(fc.constantFrom(...agents), fc.string(), (agent, reply) => {
        const result: RequestResult = { status: "succeeded", agent, reply };
        expect(spokenText(result)).toBe(reply);
      }),
    );
  });

  it("returns the question exactly for any clarification result", () => {
    fc.assert(
      fc.property(fc.string(), (question) => {
        const result: RequestResult = { status: "clarification", agent: "clarifier", question };
        expect(spokenText(result)).toBe(question);
      }),
    );
  });
});
