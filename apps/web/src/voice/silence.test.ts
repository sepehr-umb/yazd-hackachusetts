import { describe, expect, it } from "vitest";
import { createSilenceDetector, levelOf } from "./silence";

const config = { silenceThreshold: 0.1, silenceTimeoutMs: 1000, noSpeechTimeoutMs: 5000 };

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
  it("does not count silence before any speech was heard", () => {
    const detector = createSilenceDetector(config, 0);

    expect(detector.update(0.05, 1000)).toBe("listening");
    expect(detector.update(0.05, 4999)).toBe("listening");
  });

  it("gives up once no speech came within the no-speech timeout", () => {
    const detector = createSilenceDetector(config, 2000);

    expect(detector.update(0.05, 6999)).toBe("listening");
    expect(detector.update(0.05, 7000)).toBe("no_speech");
  });

  it("never reports no speech once speech was heard", () => {
    const detector = createSilenceDetector(config, 0);

    detector.update(0.5, 4000);

    expect(detector.update(0.5, 9000)).toBe("listening");
  });

  it("asks to stop once the level stayed under the threshold for the timeout after speech", () => {
    const detector = createSilenceDetector(config, 0);

    detector.update(0.5, 300);

    expect(detector.update(0.05, 1299)).toBe("listening");
    expect(detector.update(0.05, 1300)).toBe("silence");
  });

  it("restarts the timeout whenever the level rises above the threshold", () => {
    const detector = createSilenceDetector(config, 0);

    detector.update(0.5, 800);

    expect(detector.update(0.05, 1500)).toBe("listening");
    expect(detector.update(0.05, 1800)).toBe("silence");
  });
});
