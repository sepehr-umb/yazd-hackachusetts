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

  it("opens fully for loud energy across the speech band", () => {
    const loud = spectrum(80, 4000, 255);
    expect(mouthFromSpectrum(loud, HZ_PER_BIN).open).toBe(1);
  });

  it("ignores energy outside the speech band", () => {
    const hiss = spectrum(8000, 12000, 255);
    const rumble = spectrum(0, 60, 255);
    expect(mouthFromSpectrum(hiss, HZ_PER_BIN).open).toBe(0);
    expect(mouthFromSpectrum(rumble, HZ_PER_BIN).open).toBe(0);
  });

  it("opens wider as speech gets louder", () => {
    const quiet = mouthFromSpectrum(spectrum(80, 4000, 40), HZ_PER_BIN).open;
    const medium = mouthFromSpectrum(spectrum(80, 4000, 80), HZ_PER_BIN).open;
    expect(quiet).toBeGreaterThan(0);
    expect(medium).toBeGreaterThan(quiet);
  });

  it("reads frequency from hzPerBin, not from bin index", () => {
    const bins = spectrum(2000, 4000, 255);
    expect(mouthFromSpectrum(bins, HZ_PER_BIN).open).toBeGreaterThan(0);
    expect(mouthFromSpectrum(bins, 200).open).toBe(0);
  });
});
