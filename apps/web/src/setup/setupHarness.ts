import { vi } from "vitest";
import type { Language } from "../profile/languages";
import type { Vision } from "../profile/profile";
import type { Transcription } from "../request/transcribeClient";
import { createTestContext } from "../testing/testContext";
import { createSetupSurface } from "./setupSurface";

const config = { silenceThreshold: 0.1, noSpeechTimeoutMs: 8000 };

export type SetupHarnessOptions = { vision?: Vision; reduced?: boolean; voices?: Language[] };

export function mountSetup({ vision, reduced = false, voices }: SetupHarnessOptions = {}) {
  const context = createTestContext();
  if (vision) context.profile.update({ vision });
  const spoken: string[] = [];
  const endings: Array<() => void> = [];
  context.narrator = {
    say(text: string, language: Language, onEnd?: () => void) {
      spoken.push(`${language}: ${text}`);
      if (onEnd) endings.push(onEnd);
    },
    cancel() {
      spoken.push("cancel");
    },
    canSpeak: (language: Language) => voices === undefined || voices.includes(language),
  };
  const answers: Array<Transcription | Error> = [];
  const heard: Blob[] = [];
  const hints: Array<string | undefined> = [];
  const transcribe = {
    async transcribe(recording: Blob, language?: string) {
      heard.push(recording);
      hints.push(language);
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
  const welcome = () =>
    sheet.querySelector<HTMLButtonElement>("button[data-role=welcome]") as HTMLButtonElement;
  const sentence = () =>
    welcome().querySelector<HTMLElement>("[data-role=sentence]") as HTMLElement;
  const tap = async () => {
    welcome().click();
    await vi.advanceTimersByTimeAsync(0);
  };
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
  const say = async () => {
    context.mic.level = 0.5;
    await vi.advanceTimersByTimeAsync(300);
    context.mic.level = 0;
    await vi.advanceTimersByTimeAsync(1600);
  };
  const fallBack = async () => {
    answers.push({ text: "", language: undefined });
    await tap();
    await tap();
    await say();
  };
  return {
    say,
    fallBack,
    welcome,
    sentence,
    tap,
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
    hints,
    endSpeech,
  };
}
