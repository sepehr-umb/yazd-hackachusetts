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
});
