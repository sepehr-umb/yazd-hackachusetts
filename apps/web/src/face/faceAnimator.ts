import type { AssistantEvent, AssistantState } from "@mahmood/contracts";
import { blendFace } from "./blend";
import { createBlinkScheduler } from "./blink";
import { composeFace } from "./compose";
import { expressionFor } from "./expression";
import type { FaceParams } from "./faceParams";
import { createMouthSmoother, mouthFromSpectrum, type MouthShape } from "./mouth";

export type AudioFrame = { bins: ArrayLike<number>; hzPerBin: number };

export type FaceAnimator = {
  readonly state: AssistantState;
  apply(event: AssistantEvent): void;
  update(dt: number, audio: AudioFrame | null): FaceParams;
};

const EXPRESSION_RATE = 6;
const SILENT_MOUTH: MouthShape = { open: 0, width: 1, round: 0 };

export function createFaceAnimator({ random }: { random?: () => number } = {}): FaceAnimator {
  let state: AssistantState = "idle";
  let expression = expressionFor(state);
  const blink = createBlinkScheduler({ random });
  const mouth = createMouthSmoother();

  return {
    get state() {
      return state;
    },
    apply(event) {
      if (event.type === "state") state = event.state;
    },
    update(dt, audio) {
      expression = blendFace(expression, expressionFor(state), dt, EXPRESSION_RATE);
      const spoken = audio ? mouthFromSpectrum(audio.bins, audio.hzPerBin) : SILENT_MOUTH;
      return composeFace(expression, mouth.update(spoken, dt), blink.update(dt));
    },
  };
}
