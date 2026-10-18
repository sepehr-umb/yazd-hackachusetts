import { describe, expect, it } from "vitest";
import { createTestContext } from "../testing/testContext";
import { mountSurfaces } from "./mountSurfaces";
import { defaultSettings, surfaceRegistry } from "./registry";

describe("surface registry", () => {
  it("registers the face, activity panel, text input and voice, all enabled by default", () => {
    expect(surfaceRegistry.map((surface) => surface.id)).toEqual([
      "face",
      "activityPanel",
      "textInput",
      "voice",
    ]);
    expect(defaultSettings).toEqual({
      surfaces: { face: true, activityPanel: true, textInput: true, voice: true },
    });
  });

  it("renders only the surfaces the settings leave on", () => {
    const root = document.createElement("div");

    mountSurfaces({
      registry: surfaceRegistry,
      settings: { surfaces: { ...defaultSettings.surfaces, face: false, textInput: false } },
      root,
      context: createTestContext(),
    });

    const mounted = [...root.querySelectorAll("section")].map((section) => section.dataset.surface);
    expect(mounted).toEqual(["activityPanel", "voice"]);
  });

  it("leaves out the voice surface when the settings turn it off", () => {
    const root = document.createElement("div");

    mountSurfaces({
      registry: surfaceRegistry,
      settings: { surfaces: { ...defaultSettings.surfaces, face: false, voice: false } },
      root,
      context: createTestContext(),
    });

    const mounted = [...root.querySelectorAll("section")].map((section) => section.dataset.surface);
    expect(mounted).toEqual(["activityPanel", "textInput"]);
  });
});
