export type FrameScheduler = {
  requestFrame: (callback: (timestampMs: number) => void) => number;
  cancelFrame: (handle: number) => void;
};

export type FrameLoop = { stop(): void };

const MAX_FRAME_SECONDS = 0.1;

export function startFrameLoop(
  onFrame: (dt: number) => void,
  { requestFrame, cancelFrame }: FrameScheduler,
): FrameLoop {
  let handle = 0;
  let previousMs: number | undefined;
  const tick = (timestampMs: number) => {
    const dt = Math.min((timestampMs - (previousMs ?? timestampMs)) / 1000, MAX_FRAME_SECONDS);
    previousMs = timestampMs;
    onFrame(dt);
    handle = requestFrame(tick);
  };
  handle = requestFrame(tick);
  return { stop: () => cancelFrame(handle) };
}
