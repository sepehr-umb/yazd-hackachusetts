import type { AssistantEvent, AssistantState } from "@mahmood/contracts";
import { blendFace } from "./blend";
import { expressionFor } from "./expression";
import type { FaceParams } from "./faceParams";

export type AudioFrame = { bins: ArrayLike<number>; hzPerBin: number };

export type FaceAnimator = {
  readonly state: AssistantState;
  apply(event: AssistantEvent): void;
  update(dt: number, audio: AudioFrame | null): FaceParams;
};

const EXPRESSION_RATE = 6;

export function createFaceAnimator(_config: { random?: () => number } = {}): FaceAnimator {
  let state: AssistantState = "idle";
  let expression = expressionFor(state);

  return {
    get state() {
      return state;
    },
    apply(event) {
      if (event.type === "state") state = event.state;
    },
    update(dt) {
      expression = blendFace(expression, expressionFor(state), dt, EXPRESSION_RATE);
      return expression;
    },
  };
}
