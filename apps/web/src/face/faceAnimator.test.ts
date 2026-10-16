import { describe, expect, it } from "vitest";
import { createFaceAnimator } from "./faceAnimator";

const FRAME = 1 / 60;

function runFor(seconds: number, step: (dt: number) => void) {
  for (let t = 0; t < seconds; t += FRAME) step(FRAME);
}

describe("createFaceAnimator", () => {
  it("starts idle with a closed mouth and neutral brows", () => {
    const animator = createFaceAnimator({ random: () => 0.5 });
    const face = animator.update(FRAME, null);
    expect(animator.state).toBe("idle");
    expect(face.mouthOpen).toBe(0);
    expect(face.browRaise).toBeCloseTo(0, 5);
  });
});
