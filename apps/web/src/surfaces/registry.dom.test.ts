import { describe, expect, it } from "vitest";
import { defaultProfile } from "../profile/profile";
import type { Vision } from "../profile/profile";
import { createTestContext } from "../testing/testContext";
import { mountSurfaces } from "./mountSurfaces";
import { surfaceRegistry } from "./registry";
import { settingsFor } from "./settingsFor";

const mountedIds = (surfaces: Record<string, boolean>) => {
  const root = document.createElement("div");
  mountSurfaces({
    registry: surfaceRegistry,
    settings: { surfaces },
    root,
    context: createTestContext(),
  });
  return [...root.querySelectorAll("section")].map((section) => section.dataset.surface);
};

const layout = (vision: Vision) => settingsFor({ ...defaultProfile, vision }).surfaces;

describe("surface registry", () => {
  it("registers the full-screen button first and keeps the older surfaces after the new layout", () => {
    expect(surfaceRegistry.map((surface) => surface.id)).toEqual([
      "fullscreen",
      "shortcuts",
      "companion",
      "captions",
      "textInput",
      "personalize",
      "face",
      "voice",
      "activityPanel",
      "setup",
    ]);
  });

  it("mounts today's layout for full vision, in registry order", () => {
    expect(mountedIds(layout("full"))).toEqual([
      "shortcuts",
      "companion",
      "captions",
      "textInput",
      "personalize",
      "setup",
    ]);
  });

  it("mounts only the full-screen button and setup for minimal vision", () => {
    expect(mountedIds(layout("minimal"))).toEqual(["fullscreen", "setup"]);
  });

  it("can still switch the voice and activity panel back on", () => {
    expect(mountedIds({ ...layout("full"), voice: true, activityPanel: true })).toEqual([
      "shortcuts",
      "companion",
      "captions",
      "textInput",
      "personalize",
      "voice",
      "activityPanel",
      "setup",
    ]);
  });
});
