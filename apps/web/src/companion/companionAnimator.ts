import type { AssistantState } from "@mahmood/contracts";
import type { AudioFrame } from "../face/faceAnimator";
import { mouthFromSpectrum } from "../face/mouth";
import { companionParams } from "./companionParams";
import type { CompanionParams } from "./companionParams";
import { createLevelSmoother } from "./levelSmoother";

export type CompanionFrame = {
  state: AssistantState;
  micLevel: number;
  speech: AudioFrame | null;
};

export type CompanionAnimator = { update(frame: CompanionFrame, dt: number): CompanionParams };

export function createCompanionAnimator(): CompanionAnimator {
  const mic = createLevelSmoother();
  const speech = createLevelSmoother();
  let time = 0;
  let stateTime = 0;
  let current: AssistantState | undefined;
  return {
    update(frame, dt) {
      time += dt;
      stateTime = frame.state === current ? stateTime + dt : 0;
      current = frame.state;
      const spoken = frame.speech
        ? mouthFromSpectrum(frame.speech.bins, frame.speech.hzPerBin)
        : null;
      return companionParams({
        state: frame.state,
        micLevel: mic.update(frame.micLevel, dt),
        speechLevel: speech.update(spoken?.open ?? 0, dt),
        time,
        stateTime,
      });
    },
  };
}
