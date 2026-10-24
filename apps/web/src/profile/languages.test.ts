import { strings } from "@mahmood/strings";
import { describe, expect, it } from "vitest";
import { directionOf, languages } from "./languages";

const keysOf = (value: object): string[] =>
  Object.entries(value).flatMap(([key, inner]) =>
    typeof inner === "object" && inner !== null ? keysOf(inner).map((k) => `${key}.${k}`) : [key],
  );

describe("languages", () => {
  it("offers Farsi, English, Spanish and Italian", () => {
    expect(languages).toEqual(["fa", "en", "es", "it"]);
  });

  it("writes Farsi right to left and the others left to right", () => {
    expect(languages.map(directionOf)).toEqual(["rtl", "ltr", "ltr", "ltr"]);
  });

  it.each(["setup", "flip"] as const)("has every %s string in every language", (block) => {
    const expected = keysOf(strings[block].en).sort();
    for (const language of languages) {
      expect(keysOf(strings[block][language]).sort()).toEqual(expected);
      for (const text of keysOf(strings[block][language])) {
        const value = text
          .split(".")
          .reduce<unknown>(
            (node, key) => (node as Record<string, unknown>)[key],
            strings[block][language],
          );
        expect(String(value).trim()).not.toBe("");
      }
    }
  });

  it("names each language in itself", () => {
    expect(languages.map((language) => strings.setup[language].languageName)).toEqual([
      "فارسی",
      "English",
      "Español",
      "Italiano",
    ]);
  });
});
