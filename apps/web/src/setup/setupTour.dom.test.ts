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

const hello = (language: "fa" | "en" | "es" | "it") =>
  `${language}: ${strings.setup[language].sayHello}`;
const tourLines = (spoken: string[]) => spoken.filter((line) => line.includes(": "));

describe("setup welcome tour", () => {
  it("makes the whole welcome one button, with the orb and the sentence inside as decoration", () => {
    const { sheet, welcome, sentence, orb, heading, options } = mountSetup();

    expect(sheet.firstElementChild).toBe(welcome());
    expect(welcome().type).toBe("button");
    expect(welcome().getAttribute("aria-label")).toBe(
      languages.map((language) => strings.setup[language].sayHello).join(" · "),
    );
    expect(welcome().querySelector("[data-role=orb]")?.getAttribute("aria-hidden")).toBe("true");
    expect(sentence().getAttribute("aria-hidden")).toBe("true");
    expect([orb().hidden, heading().hidden, options()]).toEqual([true, true, []]);
  });

  it("starts the spoken tour on the first tap, with a haptic, and records nothing", async () => {
    const { context, spoken, heard, sentence, tap } = mountSetup();

    await tap();
    await vi.advanceTimersByTimeAsync(9000);

    expect(context.haptics).toEqual(["start"]);
    expect(tourLines(spoken)).toEqual([hello("fa")]);
    expect([sentence().textContent, sentence().lang]).toEqual([strings.setup.fa.sayHello, "fa"]);
    expect(context.mic.starts).toBe(0);
    expect(context.chimes).toEqual([]);
    expect(heard).toEqual([]);
  });

  it("pauses 1 s after each sentence, keeps showing it, then speaks the next language, looping", async () => {
    const { spoken, sentence, endSpeech, tap } = mountSetup();
    await tap();

    endSpeech();
    await vi.advanceTimersByTimeAsync(999);
    expect(tourLines(spoken)).toEqual([hello("fa")]);
    expect(sentence().lang).toBe("fa");
    await vi.advanceTimersByTimeAsync(1);
    expect(sentence().lang).toBe("en");
    for (let index = 0; index < 3; index += 1) {
      endSpeech();
      await vi.advanceTimersByTimeAsync(1000);
    }

    expect(tourLines(spoken)).toEqual([
      hello("fa"),
      hello("en"),
      hello("es"),
      hello("it"),
      hello("fa"),
    ]);
    expect(sentence().lang).toBe("fa");
  });

  it("cancels speech at once on the second tap and starts the greeting recording, ending the tour", async () => {
    const { context, spoken, endSpeech, tap } = mountSetup();
    await tap();

    await tap();
    endSpeech();
    await vi.advanceTimersByTimeAsync(5000);

    expect(spoken[spoken.indexOf(hello("fa")) + 1]).toBe("cancel");
    expect(tourLines(spoken)).toEqual([hello("fa")]);
    expect(context.chimes).toEqual(["start"]);
    expect(context.haptics).toEqual(["start", "start"]);
    expect(context.mic.starts).toBe(1);
  });

  it("skips the languages the device has no voice for", async () => {
    const { spoken, endSpeech, tap } = mountSetup({ voices: ["en", "it"] });
    await tap();

    for (let index = 0; index < 2; index += 1) {
      endSpeech();
      await vi.advanceTimersByTimeAsync(1000);
    }

    expect(tourLines(spoken)).toEqual([hello("en"), hello("it"), hello("en")]);
  });

  it("stays silent without any voice, keeps rotating the sentence, and the second tap still records", async () => {
    const { context, spoken, sentence, tap } = mountSetup({ voices: [] });
    await tap();
    await vi.advanceTimersByTimeAsync(3300);

    expect(tourLines(spoken)).toEqual([]);
    expect(sentence().lang).toBe("en");
    await tap();
    expect(context.mic.starts).toBe(1);
    expect(context.chimes).toEqual(["start"]);
  });

  it("is not shown to a returning user, even when setup is reopened", () => {
    const { context, welcome, sheet } = mountSetup({ vision: "low" });

    context.setup.open();

    expect(sheet.hidden).toBe(false);
    expect(welcome().hidden).toBe(true);
    expect(sheet.dataset.step).toBe("vision");
  });
});
