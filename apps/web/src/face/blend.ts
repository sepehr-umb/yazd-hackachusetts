import type { FaceParams } from "./faceParams";

export function easeToward(current: number, target: number, dt: number, rate: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export function blendFace(
  current: FaceParams,
  target: FaceParams,
  dt: number,
  rate: number,
): FaceParams {
  return {
    mouthOpen: easeToward(current.mouthOpen, target.mouthOpen, dt, rate),
    mouthWidth: easeToward(current.mouthWidth, target.mouthWidth, dt, rate),
    mouthRound: easeToward(current.mouthRound, target.mouthRound, dt, rate),
    blink: easeToward(current.blink, target.blink, dt, rate),
    browRaise: easeToward(current.browRaise, target.browRaise, dt, rate),
  };
}
