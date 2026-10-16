import type { FaceParams } from "./faceParams";
import type { MouthShape } from "./mouth";

export function composeFace(expression: FaceParams, mouth: MouthShape, blink: number): FaceParams {
  void blink;
  return { ...expression, mouthOpen: Math.max(expression.mouthOpen, mouth.open) };
}
