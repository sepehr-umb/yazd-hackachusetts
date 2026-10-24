import { describe, expect, it } from "vitest";
import { createOrbRenderer } from "./orbRenderer";

describe("orb renderer", () => {
  it("writes each param as a CSS custom property and the state as a data attribute", () => {
    const orb = document.createElement("span");

    createOrbRenderer(orb).render(
      { scale: 1.125, ring: 0.5, glow: 0.6, spin: 0.25, tint: 0 },
      "listening",
    );

    expect(orb.style.getPropertyValue("--scale")).toBe("1.125");
    expect(orb.style.getPropertyValue("--ring")).toBe("0.5");
    expect(orb.style.getPropertyValue("--glow")).toBe("0.6");
    expect(orb.style.getPropertyValue("--spin")).toBe("0.25");
    expect(orb.style.getPropertyValue("--tint")).toBe("0");
    expect(orb.dataset.state).toBe("listening");
  });

  it("rounds values so the style string stays short", () => {
    const orb = document.createElement("span");

    createOrbRenderer(orb).render(
      { scale: 1.0123456789, ring: 0, glow: 0.35, spin: 0, tint: 0 },
      "idle",
    );

    expect(orb.style.getPropertyValue("--scale")).toBe("1.0123");
  });
});
