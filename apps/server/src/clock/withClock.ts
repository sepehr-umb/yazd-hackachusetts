import type { ToolResult } from "@mahmood/contracts";
import { strings } from "@mahmood/strings";
import type { Tool, ToolSet } from "../orchestrator";
import type { Clock } from "./clock";
import { readMoment } from "./readMoment";

function telling(clock: Clock): Tool<"get_time"> {
  return {
    name: "get_time",
    async execute(): Promise<ToolResult> {
      const moment = readMoment(clock);
      if (moment === undefined) {
        return { ok: true, output: { applied: false, error: strings.clock.unavailable } };
      }
      return { ok: true, output: { applied: true, ...moment } };
    },
  };
}

export function withClock(tools: ToolSet, clock: Clock): ToolSet {
  return { ...tools, get_time: telling(clock) };
}
