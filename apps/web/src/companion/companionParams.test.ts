import type { AssistantState } from "@mahmood/contracts";
import { describe, expect, it } from "vitest";
import { companionParams } from "./companionParams";
import type { CompanionInput } from "./companionParams";

const input = (state: AssistantState, overrides: Partial<CompanionInput> = {}): CompanionInput => ({
  state,
  micLevel: 0,
  speechLevel: 0,
  time: 0,
  stateTime: 0,
  ...overrides,
});

describe("companionParams", () => {
  describe("idle", () => {
    it("breathes scale 1 ± 0.03 at 0.25 Hz", () => {
      const scaleAt = (time: number) => companionParams(input("idle", { time })).scale;

      expect(scaleAt(0)).toBeCloseTo(1);
      expect(scaleAt(1)).toBeCloseTo(1.03);
      expect(scaleAt(2)).toBeCloseTo(1);
      expect(scaleAt(3)).toBeCloseTo(0.97);
      expect(scaleAt(4)).toBeCloseTo(1);
    });

    it("stays within the breathing range at every moment", () => {
      for (let time = 0; time < 8; time += 0.05) {
        const { scale } = companionParams(input("idle", { time }));
        expect(scale).toBeGreaterThanOrEqual(0.97 - 1e-9);
        expect(scale).toBeLessThanOrEqual(1.03 + 1e-9);
      }
    });

    it("has no ring, spin or tint", () => {
      expect(companionParams(input("idle", { time: 1.3 }))).toMatchObject({
        ring: 0,
        spin: 0,
        tint: 0,
      });
    });
  });

  describe("listening", () => {
    it("loops an expanding ring every 1.5 s", () => {
      const ringAt = (time: number) => companionParams(input("listening", { time })).ring;

      expect(ringAt(0)).toBeCloseTo(0);
      expect(ringAt(0.75)).toBeCloseTo(0.5);
      expect(ringAt(1.5)).toBeCloseTo(0);
      expect(ringAt(2.25)).toBeCloseTo(0.5);
    });

    it("lets scale follow the mic level, louder is bigger, within a bound", () => {
      const scaleAt = (micLevel: number) => companionParams(input("listening", { micLevel })).scale;

      expect(scaleAt(0)).toBe(1);
      expect(scaleAt(0.1)).toBeGreaterThan(1);
      expect(scaleAt(0.2)).toBeGreaterThan(scaleAt(0.1));
      expect(scaleAt(1)).toBeCloseTo(1.15);
    });
  });

  describe("thinking", () => {
    it("spins slowly, a tenth of a turn per second, wrapping at one turn", () => {
      const spinAt = (time: number) => companionParams(input("thinking", { time })).spin;

      expect(spinAt(0)).toBeCloseTo(0);
      expect(spinAt(1)).toBeCloseTo(0.1);
      expect(spinAt(15)).toBeCloseTo(0.5);
      expect(spinAt(10)).toBeLessThan(1);
    });

    it("holds still in size", () => {
      expect(companionParams(input("thinking", { time: 2 })).scale).toBe(1);
    });
  });

  describe("speaking", () => {
    it("sets scale to 1 + 0.25 × speech level", () => {
      const scaleAt = (speechLevel: number) =>
        companionParams(input("speaking", { speechLevel })).scale;

      expect(scaleAt(0)).toBe(1);
      expect(scaleAt(0.5)).toBeCloseTo(1.125);
      expect(scaleAt(1)).toBeCloseTo(1.25);
    });

    it("glows brighter with louder speech", () => {
      const glowAt = (speechLevel: number) =>
        companionParams(input("speaking", { speechLevel })).glow;

      expect(glowAt(1)).toBeGreaterThan(glowAt(0));
    });
  });

  describe("error", () => {
    it("tints fully at first and settles back within 1 s", () => {
      const tintAt = (stateTime: number) => companionParams(input("error", { stateTime })).tint;

      expect(tintAt(0)).toBe(1);
      expect(tintAt(0.4)).toBeCloseTo(0.5);
      expect(tintAt(0.8)).toBe(0);
      expect(tintAt(1)).toBe(0);
      expect(tintAt(3)).toBe(0);
    });

    it("never tints outside the error state", () => {
      for (const state of ["idle", "listening", "thinking", "speaking"] as const) {
        expect(companionParams(input(state)).tint).toBe(0);
      }
    });
  });
});
