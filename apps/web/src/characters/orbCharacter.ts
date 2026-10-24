import { strings } from "@mahmood/strings";
import { createCompanionAnimator } from "../companion/companionAnimator";
import { startFrameLoop } from "../companion/companionLoop";
import { createOrbRenderer } from "../companion/orbRenderer";
import type { Profile } from "../profile/profile";
import type { Character } from "./character";

function createOrbElement(document: Document) {
  const orb = document.createElement("span");
  orb.dataset.part = "orb";
  orb.setAttribute("aria-hidden", "true");
  for (const part of ["ring", "spin", "core"]) {
    const layer = document.createElement("span");
    layer.dataset.part = part;
    orb.append(layer);
  }
  return orb;
}

export const orbCharacter: Character = {
  id: "orb",
  label: strings.characters.orb,
  mount(host, env) {
    const orb = createOrbElement(host.ownerDocument);
    host.append(orb);
    const dress = ({ hue, shape }: Profile) => {
      orb.style.setProperty("--hue", String(hue));
      orb.dataset.shape = shape;
    };
    dress(env.profile.get());
    const unsubscribe = env.profile.subscribe(dress);
    const animator = createCompanionAnimator();
    const renderer = createOrbRenderer(orb);
    const loop = startFrameLoop((dt) => {
      const state = env.shownState();
      const frame = { state, micLevel: env.micLevel(), speech: env.speech.frame() };
      renderer.render(animator.update(frame, dt), state);
    }, env);
    return () => {
      loop.stop();
      unsubscribe();
      orb.remove();
    };
  },
};
