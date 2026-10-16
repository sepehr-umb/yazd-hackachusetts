import { describe, expect, it } from "vitest";
import { isToolName, toolNames } from "./index";

describe("isToolName", () => {
  it("lists the five tools from the architecture", () => {
    expect(toolNames).toEqual([
      "call_contact",
      "send_message",
      "set_light",
      "media_control",
      "ask_for_clarification",
    ]);
  });

  it.each(toolNames)("accepts %s", (name) => {
    expect(isToolName(name)).toBe(true);
  });

  it.each([["delete_everything"], [""], [42], [null], [undefined]])("rejects %s", (value) => {
    expect(isToolName(value)).toBe(false);
  });
});
