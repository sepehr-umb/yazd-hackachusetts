import type { AssistantState } from "@mahmood/contracts";
import type { AudioFrame } from "../face/faceAnimator";
import type { Unmount } from "../surfaces/surface";
import { createCompanionAnimator } from "./companionAnimator";
import { startFrameLoop } from "./companionLoop";
import type { FrameScheduler } from "./companionLoop";
import { createOrbRenderer } from "./orbRenderer";

export type CharacterEnv = FrameScheduler & {
  shownState(): AssistantState;
  micLevel(): number;
  speech: { frame(): AudioFrame | null };
};

export function mountOrb(host: HTMLElement, env: CharacterEnv): Unmount {
  const document = host.ownerDocument;
  const orb = document.createElement("span");
  orb.dataset.part = "orb";
  orb.setAttribute("aria-hidden", "true");
  for (const part of ["ring", "spin", "core"]) {
    const layer = document.createElement("span");
    layer.dataset.part = part;
    orb.append(layer);
  }
  host.append(orb);
  const animator = createCompanionAnimator();
  const renderer = createOrbRenderer(orb);
  const loop = startFrameLoop((dt) => {
    const state = env.shownState();
    renderer.render(
      animator.update({ state, micLevel: env.micLevel(), speech: env.speech.frame() }, dt),
      state,
    );
  }, env);
  return () => {
    loop.stop();
    orb.remove();
  };
}
