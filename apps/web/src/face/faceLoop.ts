import type { AudioFrame, FaceAnimator } from "./faceAnimator";
import { uniformsFor, type FaceUniforms } from "./uniforms";

export type FaceLoopConfig = {
  animator: FaceAnimator;
  renderer: { render(uniforms: FaceUniforms): void };
  getAudio: () => AudioFrame | null;
  requestFrame: (callback: (timestampMs: number) => void) => number;
  cancelFrame: (handle: number) => void;
};

export type FaceLoop = { stop(): void };

const MAX_FRAME_SECONDS = 0.1;

export function startFaceLoop({
  animator,
  renderer,
  getAudio,
  requestFrame,
  cancelFrame,
}: FaceLoopConfig): FaceLoop {
  let handle = 0;
  let startMs: number | undefined;
  let previousMs = 0;

  const onFrame = (timestampMs: number) => {
    startMs ??= timestampMs;
    const dt = Math.min((timestampMs - (previousMs || timestampMs)) / 1000, MAX_FRAME_SECONDS);
    previousMs = timestampMs;
    const time = (timestampMs - startMs) / 1000;
    renderer.render(uniformsFor(animator.update(dt, getAudio()), time));
    handle = requestFrame(onFrame);
  };

  handle = requestFrame(onFrame);

  return {
    stop() {
      cancelFrame(handle);
    },
  };
}
