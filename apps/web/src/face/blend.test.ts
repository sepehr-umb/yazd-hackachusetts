import { describe, expect, it } from "vitest";
import { blendFace, easeToward } from "./blend";
import type { FaceParams } from "./faceParams";

describe("easeToward", () => {
  it("moves part of the way to the target in one step", () => {
    const next = easeToward(0, 1, 0.1, 10);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1);
  });

  it("takes the same path whether time arrives in one step or two", () => {
    const oneStep = easeToward(0, 1, 0.2, 8);
    const twoSteps = easeToward(easeToward(0, 1, 0.1, 8), 1, 0.1, 8);
    expect(twoSteps).toBeCloseTo(oneStep, 10);
  });
});

describe("blendFace", () => {
  const from: FaceParams = { mouthOpen: 0, mouthWidth: 0, mouthRound: 0, blink: 0, browRaise: 0 };
  const to: FaceParams = { mouthOpen: 1, mouthWidth: 1, mouthRound: 1, blink: 1, browRaise: -1 };

  it("eases every param toward its own target", () => {
    const next = blendFace(from, to, 0.1, 10);
    expect(next.mouthOpen).toBeGreaterThan(0);
    expect(next.mouthWidth).toBeGreaterThan(0);
    expect(next.mouthRound).toBeGreaterThan(0);
    expect(next.blink).toBeGreaterThan(0);
    expect(next.browRaise).toBeLessThan(0);
  });
});
