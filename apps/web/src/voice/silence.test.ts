import { describe, expect, it } from "vitest";
import { createSilenceDetector, levelOf } from "./silence";

const config = { silenceThreshold: 0.1, silenceTimeoutMs: 1000 };

describe("levelOf", () => {
  it("is 0 for a flat signal centred on 128", () => {
    expect(levelOf(new Uint8Array(64).fill(128))).toBe(0);
  });

  it("is the RMS of the signal's distance from the centre", () => {
    expect(levelOf(new Uint8Array([128 + 64, 128 - 64, 128 + 64, 128 - 64]))).toBeCloseTo(0.5);
  });

  it("is 0 for no samples", () => {
    expect(levelOf(new Uint8Array(0))).toBe(0);
  });
});

describe("createSilenceDetector", () => {
  it("asks to stop once the level stayed under the threshold for the timeout", () => {
    const detector = createSilenceDetector(config, 0);

    expect(detector.update(0.05, 999)).toBe(false);
    expect(detector.update(0.05, 1000)).toBe(true);
  });

  it("restarts the timeout whenever the level rises above the threshold", () => {
    const detector = createSilenceDetector(config, 0);

    detector.update(0.5, 800);

    expect(detector.update(0.05, 1500)).toBe(false);
    expect(detector.update(0.05, 1800)).toBe(true);
  });
});
