import type { Language } from "../profile/languages";
import type { Vision } from "../profile/profile";
import type { Transcription } from "../request/transcribeClient";
import { createTestContext } from "../testing/testContext";
import { createSetupSurface } from "./setupSurface";

const config = { silenceThreshold: 0.1, silenceTimeoutMs: 1000, noSpeechTimeoutMs: 8000 };

export function mountSetup({
  vision,
  reduced = false,
}: { vision?: Vision; reduced?: boolean } = {}) {
  const context = createTestContext();
  if (vision) context.profile.update({ vision });
  const spoken: string[] = [];
  const endings: Array<() => void> = [];
  context.narrator = {
    say(text: string, language: Language, onEnd?: () => void) {
      spoken.push(`${language}: ${text}`);
      if (onEnd) endings.push(onEnd);
    },
    stop() {
      spoken.push("stop");
    },
  };
  const answers: Array<Transcription | Error> = [];
  const heard: Blob[] = [];
  const transcribe = {
    async transcribe(recording: Blob) {
      heard.push(recording);
      const next = answers.shift() ?? { text: "", language: undefined };
      if (next instanceof Error) throw next;
      return next;
    },
  };
  const host = document.createElement("section");
  document.body.append(host);
  const unmount = createSetupSurface({ transcribe, config, reducedMotion: () => reduced }).mount(
    host,
    context,
  );
  const sheet = host.querySelector("[role=dialog]") as HTMLElement;
  const orb = () =>
    sheet.querySelector<HTMLButtonElement>("button[data-role=orb]") as HTMLButtonElement;
  const heading = () => sheet.querySelector("h2") as HTMLElement;
  const options = () => [
    ...sheet.querySelectorAll<HTMLButtonElement>("[data-role=options] button"),
  ];
  const titleOf = (button: HTMLButtonElement) =>
    button.querySelector("[data-role=title]")?.textContent ?? button.textContent;
  const pick = (text: string) =>
    options()
      .find((button) => titleOf(button) === text)
      ?.click();
  const endSpeech = () => endings.splice(0).forEach((end) => end());
  return {
    context,
    host,
    unmount,
    sheet,
    orb,
    heading,
    options,
    titleOf,
    pick,
    spoken,
    answers,
    heard,
    endSpeech,
  };
}
