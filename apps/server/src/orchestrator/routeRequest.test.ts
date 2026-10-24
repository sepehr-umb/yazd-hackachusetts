import { describe, expect, it } from "vitest";
import { routeRequest } from "./routeRequest";
import { createReplayLlmClient } from "./testing/replayLlmClient";

describe("routeRequest", () => {
  it("offers settings as a routable agent", async () => {
    const llm = createReplayLlmClient([
      {
        stopReason: "tool_use",
        content: [
          { type: "tool_use", id: "toolu_route_1", name: "route_to_agent", input: { agent: "settings" } },
        ],
      },
    ]);

    const agent = await routeRequest(llm, "speak slower");

    const schema = llm.requests[0]?.tools?.[0]?.inputSchema as {
      properties: { agent: { enum: string[] } };
    };
    expect(schema.properties.agent.enum).toContain("settings");
    expect(agent).toBe("settings");
  });

  describe("router system prompt", () => {
    async function routerSystem(): Promise<string> {
      const llm = createReplayLlmClient([{ stopReason: "end_turn", content: [] }]);
      await routeRequest(llm, "speak slower");
      return llm.requests[0]?.system ?? "";
    }

    it("describes the settings agent", async () => {
      const system = await routerSystem();

      expect(system).toMatch(/settings:/);
      for (const topic of ["speech rate", "caption size", "contrast", "silence wait", "normal"]) {
        expect(system).toContain(topic);
      }
    });

    it("names no language", async () => {
      expect(await routerSystem()).not.toMatch(/farsi/i);
    });

    it("sends mixed settings and other intents, and unclear settings intents, to the clarifier", async () => {
      expect(await routerSystem()).toContain(
        "If a request mixes a settings change with a comms, home or media intent, or you cannot tell whether it is about yazd's own settings, choose clarifier.",
      );
    });
  });
});
