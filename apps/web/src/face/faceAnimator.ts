import type { AssistantState } from "@mahmood/contracts";
import { expressionFor } from "./expression";
import type { FaceParams } from "./faceParams";

export type AudioFrame = { bins: ArrayLike<number>; hzPerBin: number };

export type FaceAnimator = {
  readonly state: AssistantState;
  update(dt: number, audio: AudioFrame | null): FaceParams;
};

export function createFaceAnimator(_config: { random?: () => number } = {}): FaceAnimator {
  const state: AssistantState = "idle";
  return {
    state,
    update() {
      return expressionFor(state);
    },
  };
}
