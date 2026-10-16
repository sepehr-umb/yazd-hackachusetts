import { describe, expect, it } from "vitest";
import { mouthFromSpectrum } from "./mouth";

const HZ_PER_BIN = 50;

function spectrum(fromHz: number, toHz: number, level: number, binCount = 256): Uint8Array {
  const bins = new Uint8Array(binCount);
  for (let i = 0; i < binCount; i++) {
    const hz = i * HZ_PER_BIN;
    if (hz >= fromHz && hz < toHz) bins[i] = level;
  }
  return bins;
}

describe("mouthFromSpectrum", () => {
  it("is closed for silence", () => {
    expect(mouthFromSpectrum(new Uint8Array(256), HZ_PER_BIN).open).toBe(0);
  });
});
