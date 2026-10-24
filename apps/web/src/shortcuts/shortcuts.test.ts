import { describe, expect, it } from "vitest";
import { DISPLAY_LANGUAGE, shortcuts } from "./shortcuts";

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

  it("displays Farsi in this phase", () => {
    expect(DISPLAY_LANGUAGE).toBe("fa");
  });
});
