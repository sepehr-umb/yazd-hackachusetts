import type { FaceParams } from "./faceParams";
import type { MouthShape } from "./mouth";

const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;

export function composeFace(expression: FaceParams, mouth: MouthShape, blink: number): FaceParams {
  return {
    ...expression,
    blink: Math.max(expression.blink, blink),
    mouthOpen: Math.max(expression.mouthOpen, mouth.open),
    mouthWidth: mix(expression.mouthWidth, mouth.width, mouth.open),
    mouthRound: mix(expression.mouthRound, mouth.round, mouth.open),
  };
}
