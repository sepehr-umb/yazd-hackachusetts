import { describe, expect, it } from "vitest";
import type { Surface, SurfaceContext } from "./surface";
import { mountSurfaces } from "./mountSurfaces";

const context: SurfaceContext = {
  events: { subscribe: () => () => {} },
  requests: { submit: async () => ({ status: "failed", failure: { reason: "unroutable" } }) },
};

function labelledSurface(id: string, log: string[] = []): Surface {
  return {
    id,
    mount(host) {
      host.textContent = `${id} surface`;
      log.push(`mount ${id}`);
      return () => log.push(`unmount ${id}`);
    },
  };
}

describe("mountSurfaces", () => {
  it("mounts only the enabled surfaces, each in its own section, in registry order", () => {
    const root = document.createElement("div");
    const registry = [labelledSurface("face"), labelledSurface("panel"), labelledSurface("text")];

    mountSurfaces({
      registry,
      settings: { surfaces: { face: true, panel: false, text: true } },
      root,
      context,
    });

    const sections = [...root.querySelectorAll("section")];
    expect(sections.map((section) => section.dataset.surface)).toEqual(["face", "text"]);
    expect(sections.map((section) => section.textContent)).toEqual([
      "face surface",
      "text surface",
    ]);
  });

  it("does not mount a surface the settings do not mention", () => {
    const root = document.createElement("div");

    mountSurfaces({
      registry: [labelledSurface("face")],
      settings: { surfaces: {} },
      root,
      context,
    });

    expect(root.querySelectorAll("section")).toHaveLength(0);
  });

  it("unmounts every mounted surface and removes its section", () => {
    const root = document.createElement("div");
    const log: string[] = [];

    const unmount = mountSurfaces({
      registry: [labelledSurface("face", log), labelledSurface("panel", log)],
      settings: { surfaces: { face: true, panel: true } },
      root,
      context,
    });
    unmount();

    expect(log).toEqual(["mount face", "mount panel", "unmount face", "unmount panel"]);
    expect(root.querySelectorAll("section")).toHaveLength(0);
  });
});
