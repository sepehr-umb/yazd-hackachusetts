import { startFrameLoop } from "../companion/companionLoop";
import type { FrameLoop, FrameScheduler } from "../companion/companionLoop";
import { createLevelSmoother } from "../companion/levelSmoother";
import type { AudioFrame } from "../face/faceAnimator";
import { mouthFromSpectrum } from "../face/mouth";
import type { VoicePhase } from "../voice/voiceSession";
import { breathColor, inkFor } from "./color";
import { flipState, initialFlip } from "./flipState";
import type { FlipPalette } from "./flipState";

export type FlipDriver = FrameScheduler & {
  element: HTMLElement;
  phase(): VoicePhase;
  palette(): FlipPalette;
  reducedMotion(): boolean;
  speaking?(): boolean;
  speech?: { frame(): AudioFrame | null };
};

function speechLevel(frame: AudioFrame | null | undefined) {
  return frame ? mouthFromSpectrum(frame.bins, frame.hzPerBin).open : 0;
}

export function startFlip(driver: FlipDriver): FrameLoop {
  const { element } = driver;
  const smoother = createLevelSmoother();
  let memory = initialFlip;
  let nowMs = 0;
  return startFrameLoop((dt) => {
    nowMs += dt * 1000;
    const palette = driver.palette();
    const next = flipState(memory, driver.phase(), nowMs, palette, driver.reducedMotion());
    memory = next.memory;
    const speaking = driver.speaking?.() ?? false;
    const level = smoother.update(speaking ? speechLevel(driver.speech?.frame()) : 0, dt);
    const breathing = speaking && !next.state.flash && driver.phase() === "idle";
    const color = breathing ? breathColor(palette.idle, level) : next.state.color;
    element.style.setProperty("--flip-color", color);
    element.style.setProperty("--flip-ink", breathing ? inkFor(color) : next.state.ink);
    element.dataset.flash = String(next.state.flash);
  }, driver);
}
