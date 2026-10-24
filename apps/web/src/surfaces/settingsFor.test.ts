import { describe, expect, it } from "vitest";
import { defaultProfile } from "../profile/profile";
import type { Vision } from "../profile/profile";
import { settingsFor } from "./settingsFor";

const on = (vision?: Vision, debug = false) =>
  Object.entries(settingsFor({ ...defaultProfile, vision }, { debug }).surfaces)
    .filter(([, enabled]) => enabled)
    .map(([id]) => id);

describe("settingsFor", () => {
  it("shows only the setup sheet until setup has run", () => {
    expect(on(undefined)).toEqual(["setup"]);
  });

  it("keeps today's layout for someone who sees the screen well", () => {
    expect(on("full")).toEqual([
      "shortcuts",
      "companion",
      "captions",
      "textInput",
      "personalize",
      "setup",
    ]);
  });

  it("keeps the shortcuts, companion, captions and text box at low vision", () => {
    expect(on("low")).toEqual([
      "shortcuts",
      "companion",
      "captions",
      "textInput",
      "personalize",
      "setup",
    ]);
  });

  it("reduces the screen to the full-screen button for someone who barely sees", () => {
    expect(on("minimal")).toEqual(["fullscreen", "setup"]);
  });

  it.each(["full", "low", "minimal"] as const)(
    "adds the activity panel at %s vision while debugging",
    (vision) => {
      expect(on(vision, true)).toEqual([...on(vision), "activityPanel"]);
    },
  );

  it("leaves the activity panel off at every level when not debugging", () => {
    for (const vision of [undefined, "full", "low", "minimal"] as const) {
      expect(on(vision, false)).not.toContain("activityPanel");
    }
  });
});
