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
});
