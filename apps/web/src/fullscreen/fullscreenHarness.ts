import { vi } from "vitest";
import type { Language } from "../profile/languages";
import { createTestContext } from "../testing/testContext";
import { createFullscreenSurface } from "./fullscreenSurface";

const config = { silenceThreshold: 0.1, noSpeechTimeoutMs: 8000 };

export function mountFullscreen({ language = "en" as Language, reduced = false } = {}) {
  const context = createTestContext();
  context.profile.update({ language, vision: "minimal" });
  const host = document.createElement("section");
  document.body.append(host);
  let pending: ((timestampMs: number) => void) | undefined;
  let clock = 0;
  const unmount = createFullscreenSurface({
    config,
    reducedMotion: () => reduced,
    requestFrame: (callback) => {
      pending = callback;
      return 1;
    },
    cancelFrame: () => {
      pending = undefined;
    },
  }).mount(host, context);
  const button = host.querySelector("[data-role=flip]") as HTMLButtonElement;
  const status = host.querySelector("[role=status]") as HTMLElement;
  const flip = () => ({
    color: host.style.getPropertyValue("--flip-color"),
    ink: host.style.getPropertyValue("--flip-ink"),
    flash: host.dataset.flash,
  });
  const runFrames = (count: number) => {
    for (let index = 0; index < count; index += 1) {
      const callback = pending;
      pending = undefined;
      clock += 1000 / 60;
      callback?.(clock);
    }
  };
  const tap = async () => {
    button.click();
    await vi.advanceTimersByTimeAsync(0);
    runFrames(1);
  };
  return { context, host, unmount, button, status, flip, runFrames, tap, pending: () => pending };
}
