import { describe, expect, it } from "vitest";
import { createTestContext } from "../testing/testContext";
import { mountSurfaces } from "./mountSurfaces";
import { defaultSettings, surfaceRegistry } from "./registry";

describe("surface registry", () => {
  it("registers the face, activity panel and text input, all enabled by default", () => {
    expect(surfaceRegistry.map((surface) => surface.id)).toEqual([
      "face",
      "activityPanel",
      "textInput",
    ]);
    expect(defaultSettings).toEqual({
      surfaces: { face: true, activityPanel: true, textInput: true },
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
    expect(mounted).toEqual(["activityPanel"]);
  });
});
