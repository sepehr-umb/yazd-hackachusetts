import { describe, expect, it } from "vitest";
import { createFaceAnimator } from "./faceAnimator";
import { startFaceLoop } from "./faceLoop";
import type { FaceUniforms } from "./uniforms";

function harness(options: { getAudio?: () => { bins: ArrayLike<number>; hzPerBin: number } | null } = {}) {
  const drawn: FaceUniforms[] = [];
  let pending: ((timestampMs: number) => void) | undefined;
  const animator = createFaceAnimator({ random: () => 0.5 });
  const loop = startFaceLoop({
    animator,
    renderer: { render: (uniforms) => drawn.push(uniforms) },
    getAudio: options.getAudio ?? (() => null),
    requestFrame: (callback) => {
      pending = callback;
      return 1;
    },
    cancelFrame: () => {
      pending = undefined;
    },
  });
  const frame = (timestampMs: number) => {
    const callback = pending;
    pending = undefined;
    callback?.(timestampMs);
  };
  return { animator, drawn, loop, frame, isScheduled: () => pending !== undefined };
}

describe("startFaceLoop", () => {
  it("draws each frame with the clock in seconds since the first frame", () => {
    const { drawn, frame } = harness();
    frame(5000);
    frame(5500);
    frame(7000);
    expect(drawn.map((uniforms) => uniforms.uTime)).toEqual([0, 0.5, 2]);
  });

  it("caps a long gap such as a hidden tab so the face never lurches", () => {
    const { animator, drawn, frame } = harness();
    frame(1000);
    animator.apply({ type: "state", state: "listening" });
    frame(60000);
    expect(drawn).toHaveLength(2);
    const eased = 0.6 * (1 - Math.exp(-6 * 0.1));
    expect(animator.update(0, null).browRaise).toBeLessThanOrEqual(eased + 1e-9);
  });

  it("feeds playback audio to the mouth", () => {
    const loud = { bins: new Uint8Array(256).fill(230), hzPerBin: 50 };
    const { animator, drawn, frame } = harness({ getAudio: () => loud });
    animator.apply({ type: "state", state: "speaking" });
    for (let t = 0; t <= 500; t += 16) frame(t);
    expect(drawn.at(-1)?.uMouthOpen).toBeGreaterThan(0.8);
  });

  it("stops scheduling frames once stopped", () => {
    const { loop, isScheduled } = harness();
    expect(isScheduled()).toBe(true);
    loop.stop();
    expect(isScheduled()).toBe(false);
  });
});
