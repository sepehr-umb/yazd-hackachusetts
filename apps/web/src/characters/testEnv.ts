import type { AssistantState } from "@mahmood/contracts";
import type { AudioFrame } from "../face/faceAnimator";
import { createProfileStore } from "../profile/profileStore";
import type { CharacterEnv } from "./character";

export function createCharacterEnv() {
  let pending: ((timestampMs: number) => void) | undefined;
  let clock = 0;
  const control = {
    state: "idle" as AssistantState,
    mic: 0,
    speech: null as AudioFrame | null,
  };
  const env: CharacterEnv = {
    shownState: () => control.state,
    micLevel: () => control.mic,
    speech: { frame: () => control.speech },
    profile: createProfileStore(new Map()),
    requestFrame: (callback) => {
      pending = callback;
      return 1;
    },
    cancelFrame: () => {
      pending = undefined;
    },
  };
  const runFrames = (count: number) => {
    for (let index = 0; index < count; index += 1) {
      const callback = pending;
      pending = undefined;
      clock += 1000 / 60;
      callback?.(clock);
    }
  };
  return { env, control, runFrames, isScheduled: () => pending !== undefined };
}
