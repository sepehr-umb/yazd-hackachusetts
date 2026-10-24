import { describe, expect, it } from "vitest";
import { agentNames, isToolName, toolNames } from "./index";

describe("isToolName", () => {
  it("lists the tools from the architecture, the settings tools, and get_time", () => {
    expect(toolNames).toEqual([
      "call_contact",
      "send_message",
      "set_light",
      "media_control",
      "ask_for_clarification",
      "update_setting",
      "reset_settings",
      "get_time",
    ]);
  });

  it("lists the clock agent exactly once", () => {
    expect(agentNames.filter((name) => name === "clock")).toEqual(["clock"]);
  });

  it("accepts get_time", () => {
    expect(isToolName("get_time")).toBe(true);
  });

  it.each(toolNames)("accepts %s", (name) => {
    expect(isToolName(name)).toBe(true);
  });

  it.each([
    ["delete_everything"],
    [""],
    [42],
    [null],
    [undefined],
    [{}],
    [["get_time"]],
    [true],
    [Symbol("get_time")],
  ])("rejects %s without throwing", (value) => {
    expect(() => isToolName(value)).not.toThrow();
    expect(isToolName(value)).toBe(false);
  });
});
