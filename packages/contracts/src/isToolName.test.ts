import { describe, expect, it } from "vitest";
import { isToolName, toolNames } from "./index";

describe("isToolName", () => {
  it("lists the tools from the architecture and the settings tools", () => {
    expect(toolNames).toEqual([
      "call_contact",
      "send_message",
      "set_light",
      "media_control",
      "ask_for_clarification",
      "update_setting",
      "reset_settings",
    ]);
  });

  it.each(toolNames)("accepts %s", (name) => {
    expect(isToolName(name)).toBe(true);
  });

  it.each([["delete_everything"], [""], [42], [null], [undefined]])("rejects %s", (value) => {
    expect(isToolName(value)).toBe(false);
  });
});
