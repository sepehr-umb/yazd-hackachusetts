import type { AssistantState } from "@mahmood/contracts";
import type { FrameScheduler } from "../companion/companionLoop";
import type { AudioFrame } from "../face/faceAnimator";
import type { ProfileStore } from "../profile/profileStore";
import type { Unmount } from "../surfaces/surface";

export type CharacterEnv = FrameScheduler & {
  shownState(): AssistantState;
  micLevel(): number;
  speech: { frame(): AudioFrame | null };
  profile: ProfileStore;
};

export type Character = {
  id: string;
  label: string;
  mount(host: HTMLElement, env: CharacterEnv): Unmount;
};
