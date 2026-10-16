import { describe, expect, it } from "vitest";
import { createBlinkScheduler } from "./blink";

const config = { minInterval: 2, maxInterval: 6, duration: 0.16 };

describe("createBlinkScheduler", () => {
  it("closes the eyes fully halfway through a blink", () => {
    const blink = createBlinkScheduler({ ...config, random: () => 0 });
    expect(blink.update(2)).toBeCloseTo(0, 5);
    expect(blink.update(0.08)).toBeCloseTo(1, 5);
  });
});
