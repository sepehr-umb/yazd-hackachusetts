import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Character } from "../characters/character";
import { mountCompanion as mounted } from "./companionHarness";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("companion surface and the profile", () => {
  it("names the companion from the profile, visibly and in its label, and follows changes", () => {
    const { context, host, button } = mounted();
    const name = host.querySelector("[data-role=name]") as HTMLElement;

    expect(name.textContent).toBe("yazd");
    expect(name.dir).toBe("auto");
    context.profile.update({ name: "ماهی" });

    expect(name.textContent).toBe("ماهی");
    expect(button.getAttribute("aria-label")).toBe("Tap to talk to ماهی");
  });

  it("mounts the character the profile names and swaps it live", () => {
    const log: string[] = [];
    const fake = (id: string): Character => ({
      id,
      label: id,
      mount(host) {
        const mark = document.createElement("span");
        mark.dataset.character = id;
        host.append(mark);
        log.push(`mount ${id}`);
        return () => {
          mark.remove();
          log.push(`unmount ${id}`);
        };
      },
    });
    const { context, button } = mounted([fake("orb"), fake("face")]);

    context.profile.update({ character: "orb" });
    context.profile.update({ hue: 12 });

    expect(log).toEqual(["mount face", "unmount face", "mount orb"]);
    expect(button.querySelector("[data-character]")?.getAttribute("data-character")).toBe("orb");
  });
});
