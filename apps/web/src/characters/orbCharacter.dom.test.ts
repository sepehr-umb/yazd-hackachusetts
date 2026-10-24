import { describe, expect, it } from "vitest";
import { orbCharacter } from "./orbCharacter";
import { createCharacterEnv } from "./testEnv";

function mounted() {
  const harness = createCharacterEnv();
  const host = document.createElement("div");
  const unmount = orbCharacter.mount(host, harness.env);
  const orb = host.querySelector<HTMLElement>("[data-part=orb]") as HTMLElement;
  return { ...harness, host, unmount, orb };
}

describe("orb character", () => {
  it("is listed as the orb with a label from strings", () => {
    expect(orbCharacter.id).toBe("orb");
    expect(orbCharacter.label).toBe("Glowing orb");
  });

  it("holds a microphone glyph, hidden from screen readers", () => {
    const { orb } = mounted();
    const mic = orb.querySelector("[data-part=mic]");

    expect(mic?.getAttribute("aria-hidden")).toBe("true");
    expect(mic?.querySelector("svg path")).not.toBeNull();
  });

  it("draws in the profile's hue and shape", () => {
    const { orb } = mounted();

    expect(orb.style.getPropertyValue("--hue")).toBe("30");
    expect(orb.dataset.shape).toBe("circle");
  });

  it("recolors and reshapes at once when the profile changes", () => {
    const { env, orb } = mounted();

    env.profile.update({ hue: 12, shape: "ring" });

    expect(orb.style.getPropertyValue("--hue")).toBe("12");
    expect(orb.dataset.shape).toBe("ring");
  });

  it("animates from the shown state and the speech frames", () => {
    const { control, orb, runFrames } = mounted();
    control.state = "speaking";
    control.speech = { bins: new Uint8Array(64).fill(255), hzPerBin: 100 };

    runFrames(12);

    expect(orb.dataset.state).toBe("speaking");
    expect(Number(orb.style.getPropertyValue("--scale"))).toBeGreaterThan(1.2);
  });

  it("stops drawing, stops following the profile and removes itself when unmounted", () => {
    const { env, host, unmount, orb, isScheduled } = mounted();

    unmount();
    env.profile.update({ hue: 50 });

    expect(isScheduled()).toBe(false);
    expect(orb.style.getPropertyValue("--hue")).toBe("30");
    expect(host.children).toHaveLength(0);
  });
});
