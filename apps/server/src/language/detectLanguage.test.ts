import { describe, expect, it } from "vitest";
import { detectLanguage, greetings } from "./detectLanguage";

describe("detectLanguage", () => {
  it.each(
    Object.entries(greetings).flatMap(([language, words]) => words.map((word) => [word, language])),
  )("hears %j as %s", (word, language) => {
    expect(detectLanguage(word)).toBe(language);
  });

  it.each([
    ["Hello!", "en"],
    ["¡Hola!", "es"],
    ["Ciao ciao", "it"],
    ["Buenos días", "es"],
    ["BUONGIORNO.", "it"],
    ["Hi, how are you?", "en"],
  ])("normalizes case, punctuation and accents in %j", (text, language) => {
    expect(detectLanguage(text)).toBe(language);
  });

  it.each(["سلام", "سلام خوبی؟", "مرحبا"])("hears Arabic script %j as Farsi", (text) => {
    expect(detectLanguage(text)).toBe("fa");
  });

  it.each(["", "   ", "good morning", "chiaro", "holanda", "hiya"])(
    "returns nothing for %j, matching whole words only",
    (text) => {
      expect(detectLanguage(text)).toBeUndefined();
    },
  );

  it("returns nothing when greetings from two languages are mixed", () => {
    expect(detectLanguage("hola hello")).toBeUndefined();
  });
});
