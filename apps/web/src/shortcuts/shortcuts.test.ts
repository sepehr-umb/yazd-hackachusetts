import { describe, expect, it } from "vitest";
import { languages } from "../profile/languages";
import { shortcuts } from "./shortcuts";

describe("shortcut data", () => {
  it("seeds the six shortcuts in order", () => {
    expect(shortcuts.map(({ id, kind }) => [id, kind])).toEqual([
      ["callMom", "call"],
      ["callDad", "call"],
      ["lightsOn", "light"],
      ["lightsOff", "light"],
      ["tvPlay", "tv"],
      ["tvPause", "tv"],
    ]);
  });

  it("gives every shortcut a label and a phrase in Farsi and English", () => {
    for (const { text } of shortcuts) {
      for (const language of ["fa", "en"]) {
        expect(text[language]?.label.trim()).not.toBe("");
        expect(text[language]?.phrase.trim()).not.toBe("");
      }
    }
  });

  it("uses the phrases as written in the brief", () => {
    const phrase = (id: string, language: string) =>
      shortcuts.find((shortcut) => shortcut.id === id)?.text[language]?.phrase;

    expect(phrase("callMom", "fa")).toBe("به مامان زنگ بزن");
    expect(phrase("callMom", "en")).toBe("Call Mom");
    expect(phrase("tvPause", "fa")).toBe("تلویزیون را متوقف کن");
    expect(phrase("lightsOff", "en")).toBe("Kitchen light off");
  });

  it("names no messaging brand", () => {
    expect(JSON.stringify(shortcuts)).not.toMatch(/whatsapp|telegram|signal|skype|viber/i);
  });

  it("has a label and a phrase in every language the profile offers", () => {
    for (const { text } of shortcuts) {
      expect(Object.keys(text).sort()).toEqual([...languages].sort());
    }
  });

  it.each([
    [
      "es",
      [
        "Llama a mamá",
        "Llama a papá",
        "Enciende la luz de la cocina",
        "Apaga la luz de la cocina",
        "Reproduce la tele",
        "Pausa la tele",
      ],
    ],
    [
      "it",
      [
        "Chiama la mamma",
        "Chiama papà",
        "Accendi la luce della cucina",
        "Spegni la luce della cucina",
        "Riproduci la TV",
        "Metti in pausa la TV",
      ],
    ],
  ])("says each shortcut in %s exactly as written", (language, phrases) => {
    expect(shortcuts.map((shortcut) => shortcut.text[language]?.phrase)).toEqual(phrases);
    expect(shortcuts.map((shortcut) => shortcut.text[language]?.label)).toEqual(phrases);
  });
});
