import { describe, expect, it } from "vitest";
import { createTestContext } from "../testing/testContext";
import { mountSurfaces } from "./mountSurfaces";
import { defaultSettings, surfaceRegistry } from "./registry";

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

describe("surface registry", () => {
  it("registers the shortcuts and companion layout first and keeps the older surfaces after it", () => {
    expect(surfaceRegistry.map((surface) => surface.id)).toEqual([
      "shortcuts",
      "companion",
      "captions",
      "textInput",
      "personalize",
      "face",
      "voice",
      "activityPanel",
    ]);
  });

  it("turns on the shortcuts, companion, captions, text input and personalize and leaves the older surfaces off", () => {
    expect(defaultSettings).toEqual({
      surfaces: {
        shortcuts: true,
        companion: true,
        captions: true,
        textInput: true,
        personalize: true,
        face: false,
        voice: false,
        activityPanel: false,
      },
    });
    expect(mountedIds(defaultSettings.surfaces)).toEqual([
      "shortcuts",
      "companion",
      "captions",
      "textInput",
      "personalize",
    ]);
  });

  it("can still switch the voice and activity panel back on", () => {
    expect(mountedIds({ ...defaultSettings.surfaces, voice: true, activityPanel: true })).toEqual([
      "shortcuts",
      "companion",
      "captions",
      "textInput",
      "personalize",
      "voice",
      "activityPanel",
    ]);
  });
});
