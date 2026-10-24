import { vi } from "vitest";
import type { Character } from "../characters/character";
import type { Vision } from "../profile/profile";
import { orbCharacter } from "../characters/orbCharacter";
import { createTestContext } from "../testing/testContext";
import { createCompanionSurface } from "./companionSurface";

const config = { silenceThreshold: 0.1, noSpeechTimeoutMs: 8000 };

export function mountCompanion(characters: Character[] = [orbCharacter], vision?: Vision) {
  const context = createTestContext();
  if (vision) context.profile.update({ vision });
  const host = document.createElement("section");
  document.body.append(host);
  const queue = new Map<number, (timestampMs: number) => void>();
  let nextHandle = 0;
  let clock = 0;
  const unmount = createCompanionSurface({
    config,
    characters,
    requestFrame: (callback) => {
      nextHandle += 1;
      queue.set(nextHandle, callback);
      return nextHandle;
    },
    cancelFrame: (handle) => {
      queue.delete(handle);
    },
  }).mount(host, context);
  const button = host.querySelector("button") as HTMLButtonElement;
  const status = host.querySelector("[role=status]") as HTMLElement;
  const orb = () => host.querySelector<HTMLElement>("[data-part=orb]") as HTMLElement;
  const cssVar = (name: string) => Number(orb().style.getPropertyValue(name));
  const runFrames = (count: number) => {
    for (let index = 0; index < count; index += 1) {
      const callbacks = [...queue.values()];
      queue.clear();
      clock += 1000 / 60;
      callbacks.forEach((callback) => callback(clock));
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
    pending: () => (queue.size > 0 ? [...queue.values()][0] : undefined),
  };
}
