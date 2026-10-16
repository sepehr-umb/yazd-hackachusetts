import { describe, expect, it } from "vitest";
import type { FaceParams } from "./faceParams";
import { uniformsFor } from "./uniforms";

const face: FaceParams = { mouthOpen: 0.3, mouthWidth: 0.7, mouthRound: 0.2, blink: 0.5, browRaise: -0.4 };

describe("uniformsFor", () => {
  it("names each face param and the clock after its shader uniform", () => {
    expect(uniformsFor(face, 12.5)).toEqual({
      uMouthOpen: 0.3,
      uMouthWidth: 0.7,
      uMouthRound: 0.2,
      uBlink: 0.5,
      uBrowRaise: -0.4,
      uTime: 12.5,
    });
  });
});
