import { describe, expect, it } from "vitest";
import { isToggleKey } from "./toggleKeys";

const key = (init: Partial<KeyboardEvent>, target: unknown = null) =>
  ({
    key: " ",
    repeat: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    target,
    ...init,
  }) as KeyboardEvent;

const element = (ownsKeys: boolean) => ({ closest: () => (ownsKeys ? {} : null) });

describe("isToggleKey", () => {
  it.each([" ", "Enter"])("accepts %j pressed on the page", (pressed) => {
    expect(isToggleKey(key({ key: pressed }, element(false)))).toBe(true);
  });

  it("rejects other keys, repeats and modified presses", () => {
    expect(isToggleKey(key({ key: "a" }))).toBe(false);
    expect(isToggleKey(key({ repeat: true }))).toBe(false);
    expect(isToggleKey(key({ ctrlKey: true }))).toBe(false);
    expect(isToggleKey(key({ metaKey: true }))).toBe(false);
    expect(isToggleKey(key({ altKey: true }))).toBe(false);
  });

  it("leaves keys alone inside fields and buttons that handle them", () => {
    expect(isToggleKey(key({}, element(true)))).toBe(false);
  });
});
