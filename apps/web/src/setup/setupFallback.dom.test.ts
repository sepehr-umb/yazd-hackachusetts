import { strings } from "@mahmood/strings";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { languages } from "../profile/languages";
import { mountSetup } from "./setupHarness";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("setup when no language is heard", () => {
  it("offers only the orb at first", () => {
    expect(mountSetup().options()).toEqual([]);
  });

  it("stops rotating and says it did not catch that in all four languages, stacked", async () => {
    const { heading, fallBack } = mountSetup();

    await fallBack();
    const lines = [...heading().querySelectorAll<HTMLElement>("[data-role=line]")];
    vi.advanceTimersByTime(10000);

    expect(lines.map((line) => [line.lang, line.dir, line.textContent])).toEqual(
      languages.map((language) => [language, "auto", strings.setup[language].didNotCatch]),
    );
    expect(heading().querySelectorAll("[data-role=line]")).toHaveLength(4);
    expect(heading().dataset.fading).toBeUndefined();
  });

  it("shows the four language buttons, each named in itself", async () => {
    const { options, fallBack } = mountSetup();

    await fallBack();

    expect(options().map((button) => [button.textContent, button.lang, button.dir])).toEqual([
      ["فارسی", "fa", "auto"],
      ["English", "en", "auto"],
      ["Español", "es", "auto"],
      ["Italiano", "it", "auto"],
    ]);
  });

  it("falls back the same way when transcription fails or the microphone is refused", async () => {
    const failed = mountSetup();
    failed.answers.push(new Error("offline"));
    failed.orb().click();
    await vi.advanceTimersByTimeAsync(0);
    await failed.say();
    expect(failed.options()).toHaveLength(4);

    const refused = mountSetup();
    refused.context.mic.refuse(new Error("denied"));
    refused.orb().click();
    await vi.advanceTimersByTimeAsync(0);
    expect(refused.options()).toHaveLength(4);
  });

  it("continues with the spoken vision question in the chosen language, then listens", async () => {
    const { context, pick, spoken, endSpeech, fallBack } = mountSetup();
    await fallBack();

    pick("Español");
    endSpeech();
    await vi.advanceTimersByTimeAsync(0);

    expect(spoken.at(-1)).toBe(`es: ${strings.setup.es.visionQuestionSpoken}`);
    expect(context.mic.starts).toBe(2);
  });
});
