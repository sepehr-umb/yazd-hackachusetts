import { describe, expect, it } from "vitest";
import { fakeSpectrum } from "./fakeSpectrum";
import { mouthFromSpectrum, type MouthShape } from "./mouth";

const BIN_COUNT = 256;
const HZ_PER_BIN = 50;

function shapesOver(seconds: number): MouthShape[] {
  const shapes: MouthShape[] = [];
  for (let t = 0; t < seconds; t += 1 / 60) {
    shapes.push(mouthFromSpectrum(fakeSpectrum(t, BIN_COUNT, HZ_PER_BIN), HZ_PER_BIN));
  }
  return shapes;
}

describe("fakeSpectrum", () => {
  it("returns one byte per bin, always the same for the same moment", () => {
    const a = fakeSpectrum(1.234, BIN_COUNT, HZ_PER_BIN);
    expect(a).toHaveLength(BIN_COUNT);
    expect(Array.from(fakeSpectrum(1.234, BIN_COUNT, HZ_PER_BIN))).toEqual(Array.from(a));
  });

  it("pulses like syllables: loud peaks with silent gaps", () => {
    const opens = shapesOver(2).map((shape) => shape.open);
    expect(Math.max(...opens)).toBeGreaterThan(0.7);
    expect(Math.min(...opens)).toBe(0);
  });

  it("sweeps between rounded and spread vowels", () => {
    const loud = shapesOver(6).filter((shape) => shape.open > 0.3);
    const rounds = loud.map((shape) => shape.round);
    expect(Math.min(...rounds)).toBeLessThan(0.3);
    expect(Math.max(...rounds)).toBeGreaterThan(0.7);
  });
});
