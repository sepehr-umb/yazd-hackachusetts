import { describe, expect, it } from "vitest";
import { createNarrator } from "./narrator";
import type { SynthLike, UtteranceLike } from "./narrator";

function fakeSynth(voices: Array<{ lang: string; name: string }>) {
  const spoken: UtteranceLike[] = [];
  let cancels = 0;
  const synth: SynthLike = {
    speak: (utterance) => spoken.push(utterance),
    cancel: () => {
      cancels += 1;
    },
    getVoices: () => voices,
  };
  const createUtterance = (text: string): UtteranceLike => ({ text, lang: "", voice: null });
  return { synth, createUtterance, spoken, cancels: () => cancels };
}

describe("narrator", () => {
  it("speaks in the language asked for, with a matching voice", () => {
    const fake = fakeSynth([
      { lang: "en-US", name: "Samantha" },
      { lang: "it-IT", name: "Alice" },
    ]);
    const narrator = createNarrator(fake);

    narrator.say("Quanto bene vedi lo schermo?", "it");

    expect(fake.spoken).toEqual([
      {
        text: "Quanto bene vedi lo schermo?",
        lang: "it-IT",
        voice: { lang: "it-IT", name: "Alice" },
      },
    ]);
  });

  it("stays silent when the device has no voice for the language", () => {
    const fake = fakeSynth([{ lang: "en-US", name: "Samantha" }]);

    createNarrator(fake).say("صفحه را چقدر خوب می‌بینید؟", "fa");

    expect(fake.spoken).toEqual([]);
  });

  it("still tries when the device has not listed its voices yet", () => {
    const fake = fakeSynth([]);

    createNarrator(fake).say("Elige tu idioma", "es");

    expect(fake.spoken).toEqual([{ text: "Elige tu idioma", lang: "es-ES", voice: null }]);
  });

  it("stops whatever is being said", () => {
    const fake = fakeSynth([]);

    createNarrator(fake).stop();

    expect(fake.cancels()).toBe(1);
  });

  it("does nothing, quietly, without speech synthesis or when it throws", () => {
    const broken: SynthLike = {
      speak: () => {
        throw new Error("not allowed");
      },
      cancel: () => {
        throw new Error("not allowed");
      },
      getVoices: () => [],
    };

    expect(() => createNarrator({}).say("Hello", "en")).not.toThrow();
    expect(() =>
      createNarrator({
        synth: broken,
        createUtterance: (text) => ({ text, lang: "", voice: null }),
      }).say("Hello", "en"),
    ).not.toThrow();
    expect(() => createNarrator({ synth: broken }).stop()).not.toThrow();
  });
});
