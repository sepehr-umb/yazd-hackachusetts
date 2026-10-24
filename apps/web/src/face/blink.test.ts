import { describe, expect, it } from "vitest";
import { createBlinkScheduler } from "./blink";

const config = { minInterval: 2, maxInterval: 6, duration: 0.16 };

describe("createBlinkScheduler", () => {
  it("closes the eyes fully halfway through a blink", () => {
    const blink = createBlinkScheduler({ ...config, random: () => 0 });
    expect(blink.update(2)).toBeCloseTo(0, 5);
    expect(blink.update(0.08)).toBeCloseTo(1, 5);
  });

  it("keeps the eyes open until the interval has elapsed", () => {
    const blink = createBlinkScheduler({ ...config, random: () => 0 });
    expect(blink.update(1.9)).toBe(0);
  });

  it("reopens the eyes when the blink ends", () => {
    const blink = createBlinkScheduler({ ...config, random: () => 0 });
    blink.update(2);
    expect(blink.update(0.16)).toBe(0);
    expect(blink.update(0.01)).toBe(0);
  });

  it("draws a fresh randomized interval after each blink", () => {
    const draws = [0, 1];
    const blink = createBlinkScheduler({ ...config, random: () => draws.shift() ?? 0 });
    blink.update(2);
    blink.update(0.16);
    expect(blink.update(5.9)).toBe(0);
    expect(blink.update(0.1)).toBeCloseTo(0, 5);
    expect(blink.update(0.08)).toBeCloseTo(1, 5);
  });
});
