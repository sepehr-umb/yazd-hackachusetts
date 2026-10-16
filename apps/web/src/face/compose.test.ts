import { describe, expect, it } from "vitest";
import { composeFace } from "./compose";
import type { FaceParams } from "./faceParams";

const base: FaceParams = { mouthOpen: 0, mouthWidth: 0.6, mouthRound: 0.1, blink: 0, browRaise: 0.2 };
const silent = { open: 0, width: 1, round: 0 };

describe("composeFace", () => {
  it("leaves the expression alone when the mouth is silent and no blink is active", () => {
    expect(composeFace(base, silent, 0)).toEqual(base);
  });

  it("opens the mouth by the speech amount", () => {
    const face = composeFace(base, { open: 0.7, width: 1, round: 0 }, 0);
    expect(face.mouthOpen).toBeCloseTo(0.7, 5);
  });
});
