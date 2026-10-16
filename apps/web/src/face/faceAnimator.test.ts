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

  it("follows state events and settles on that state's expression", () => {
    const animator = createFaceAnimator({ random: () => 0.5 });
    animator.apply({ type: "state", state: "error" });
    let face = animator.update(FRAME, null);
    runFor(2, (dt) => (face = animator.update(dt, null)));
    expect(animator.state).toBe("error");
    expect(face.browRaise).toBeCloseTo(-0.8, 2);
  });

  it("eases into a new expression instead of snapping", () => {
    const animator = createFaceAnimator({ random: () => 0.5 });
    animator.apply({ type: "state", state: "listening" });
    const face = animator.update(FRAME, null);
    expect(face.browRaise).toBeGreaterThan(0);
    expect(face.browRaise).toBeLessThan(0.3);
  });

  it("ignores events that are not state changes", () => {
    const animator = createFaceAnimator({ random: () => 0.5 });
    animator.apply({ type: "state", state: "thinking" });
    animator.apply({ type: "transcript", text: "salam" });
    animator.apply({ type: "agent", agent: "comms" });
    expect(animator.state).toBe("thinking");
  });

  it("opens the mouth from playback audio", () => {
    const animator = createFaceAnimator({ random: () => 0.5 });
    animator.apply({ type: "state", state: "speaking" });
    const loud = { bins: new Uint8Array(256).fill(230), hzPerBin: 50 };
    let face = animator.update(FRAME, loud);
    runFor(0.5, (dt) => (face = animator.update(dt, loud)));
    expect(face.mouthOpen).toBeGreaterThan(0.8);
  });

  it("closes the mouth again when the audio stops", () => {
    const animator = createFaceAnimator({ random: () => 0.5 });
    animator.apply({ type: "state", state: "speaking" });
    const loud = { bins: new Uint8Array(256).fill(230), hzPerBin: 50 };
    runFor(0.5, (dt) => animator.update(dt, loud));
    let face = animator.update(FRAME, null);
    runFor(1.5, (dt) => (face = animator.update(dt, null)));
    expect(face.mouthOpen).toBeLessThan(0.02);
  });

  it("blinks on its own schedule", () => {
    const animator = createFaceAnimator({ random: () => 0 });
    let peak = 0;
    runFor(3, (dt) => (peak = Math.max(peak, animator.update(dt, null).blink)));
    expect(peak).toBeGreaterThan(0.9);
  });
});
