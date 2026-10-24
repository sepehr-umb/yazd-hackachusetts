import { strings } from "@mahmood/strings";
import { createFaceAnimator, createFaceRenderer, startFaceLoop } from "../face";
import type { FaceAnimator, FaceRenderer } from "../face";
import type { Character, CharacterEnv } from "./character";
import { orbCharacter } from "./orbCharacter";

export type FaceCharacterDeps = {
  createRenderer?: (canvas: HTMLCanvasElement) => FaceRenderer;
  fallback?: Character;
};

function followShownState(inner: FaceAnimator, env: CharacterEnv): FaceAnimator {
  return {
    get state() {
      return inner.state;
    },
    apply: inner.apply,
    update(dt, audio) {
      inner.apply({ type: "state", state: env.shownState() });
      return inner.update(dt, audio);
    },
  };
}

export function createFaceCharacter({
  createRenderer = createFaceRenderer,
  fallback = orbCharacter,
}: FaceCharacterDeps = {}): Character {
  return {
    id: "face",
    label: strings.characters.face,
    mount(host, env) {
      const canvas = host.ownerDocument.createElement("canvas");
      canvas.dataset.part = "face";
      canvas.setAttribute("aria-hidden", "true");
      host.append(canvas);
      let renderer: FaceRenderer;
      try {
        renderer = createRenderer(canvas);
      } catch {
        canvas.remove();
        return fallback.mount(host, env);
      }
      const loop = startFaceLoop({
        animator: followShownState(createFaceAnimator(), env),
        renderer,
        getAudio: env.speech.frame,
        requestFrame: env.requestFrame,
        cancelFrame: env.cancelFrame,
      });
      return () => {
        loop.stop();
        canvas.remove();
      };
    },
  };
}

export const faceCharacter = createFaceCharacter();
