import { vi } from "vitest";
import type { Character } from "../characters/character";
import { orbCharacter } from "../characters/orbCharacter";
import { createTestContext } from "../testing/testContext";
import { createCompanionSurface } from "./companionSurface";

const config = { silenceThreshold: 0.1, noSpeechTimeoutMs: 8000 };

export function mountCompanion(characters: Character[] = [orbCharacter]) {
  const context = createTestContext();
  const host = document.createElement("section");
  document.body.append(host);
  let pending: ((timestampMs: number) => void) | undefined;
  let clock = 0;
  const unmount = createCompanionSurface({
    config,
    characters,
    requestFrame: (callback) => {
      pending = callback;
      return 1;
    },
    cancelFrame: () => {
      pending = undefined;
    },
  }).mount(host, context);
  const button = host.querySelector("button") as HTMLButtonElement;
  const status = host.querySelector("[role=status]") as HTMLElement;
  const orb = () => host.querySelector<HTMLElement>("[data-part=orb]") as HTMLElement;
  const cssVar = (name: string) => Number(orb().style.getPropertyValue(name));
  const runFrames = (count: number) => {
    for (let index = 0; index < count; index += 1) {
      const callback = pending;
      pending = undefined;
      clock += 1000 / 60;
      callback?.(clock);
    }
  };
  const click = async () => {
    button.click();
    await vi.advanceTimersByTimeAsync(0);
  };
  return {
    context,
    host,
    unmount,
    button,
    status,
    orb,
    cssVar,
    runFrames,
    click,
    pending: () => pending,
  };
}
