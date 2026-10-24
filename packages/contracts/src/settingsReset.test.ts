import { describe, expect, it } from "vitest";
import type { AssistantEvent, SettingsResetEvent } from "./events";
import { isAssistantEvent } from "./isAssistantEvent";

type HasKey<T, K extends string> = K extends keyof T ? true : false;

describe("settings_reset event", () => {
  it("accepts a settings_reset event", () => {
    expect(isAssistantEvent({ type: "settings_reset" })).toBe(true);
  });

  it("carries no name or value in its type", () => {
    const noName: HasKey<SettingsResetEvent, "name"> = false;
    const noValue: HasKey<SettingsResetEvent, "value"> = false;
    const event: AssistantEvent = { type: "settings_reset" };
    expect([noName, noValue]).toEqual([false, false]);
    expect(Object.keys(event)).toEqual(["type"]);
  });
});
