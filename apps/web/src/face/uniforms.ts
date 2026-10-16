import type { FaceParams } from "./faceParams";

export type FaceUniforms = {
  uMouthOpen: number;
  uMouthWidth: number;
  uMouthRound: number;
  uBlink: number;
  uBrowRaise: number;
  uTime: number;
};

export function uniformsFor(face: FaceParams, time: number): FaceUniforms {
  return {
    uMouthOpen: face.mouthOpen,
    uMouthWidth: face.mouthWidth,
    uMouthRound: face.mouthRound,
    uBlink: face.blink,
    uBrowRaise: face.browRaise,
    uTime: time,
  };
}
