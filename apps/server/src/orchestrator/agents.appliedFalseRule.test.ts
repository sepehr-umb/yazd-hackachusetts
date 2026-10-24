import { toolNames } from "@mahmood/contracts";
import { describe, expect, it } from "vitest";
import { agentDefinitions } from "./agents";
import type { SubAgentName } from "./result";

const agents = Object.keys(agentDefinitions) as SubAgentName[];

describe("shared applied false rule", () => {
  it.each(agents)(
    "%s explains briefly in the user's language and never mentions tool names",
    (agent) => {
      const { system } = agentDefinitions[agent];

      expect(system).toContain("applied false");
      expect(system).toContain("the user's language");
      expect(system).toMatch(/never mention (any )?tool names/i);
      expect(system).toMatch(/one short question/i);
    },
  );

  it.each(agents)("%s names no language", (agent) => {
    expect(agentDefinitions[agent].system).not.toMatch(
      /farsi|persian|english|arabic|italian|spanish/i,
    );
  });

  it.each(agents)("%s names no tool beyond its own", (agent) => {
    const { system, tools } = agentDefinitions[agent];
    const foreign = toolNames.filter((name) => !tools.includes(name));

    expect(foreign.filter((name) => system.includes(name))).toEqual([]);
  });

  it("keeps the clarifier asking a single question", () => {
    expect(agentDefinitions.clarifier.system).toContain("one short question");
  });
});
