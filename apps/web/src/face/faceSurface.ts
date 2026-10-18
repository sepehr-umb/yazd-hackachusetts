import type { Surface } from "../surfaces/surface";
import { createFaceAnimator } from "./faceAnimator";
import type { AudioFrame } from "./faceAnimator";
import { startFaceLoop } from "./faceLoop";
import { createFaceRenderer } from "./faceRenderer";
import type { FaceRenderer } from "./faceRenderer";

export type FaceSurfaceDeps = {
  createRenderer?: (canvas: HTMLCanvasElement) => FaceRenderer;
  requestFrame?: (callback: (timestampMs: number) => void) => number;
  cancelFrame?: (handle: number) => void;
  getAudio?: () => AudioFrame | null;
};

export function createFaceSurface({
  createRenderer = createFaceRenderer,
  requestFrame = (callback) => requestAnimationFrame(callback),
  cancelFrame = (handle) => cancelAnimationFrame(handle),
  getAudio = () => null,
}: FaceSurfaceDeps = {}): Surface {
  return {
    id: "face",
    mount(host, context) {
      const canvas = host.ownerDocument.createElement("canvas");
      host.append(canvas);
      const animator = createFaceAnimator();
      const unsubscribe = context.events.subscribe((event) => animator.apply(event));
      const loop = startFaceLoop({
        animator,
        renderer: createRenderer(canvas),
        getAudio,
        requestFrame,
        cancelFrame,
      });
      return () => {
        loop.stop();
        unsubscribe();
        canvas.remove();
      };
    },
  };
}

export const faceSurface = createFaceSurface();
