import { readFileSync } from "node:fs";
import { strings } from "@mahmood/strings";
import { describe, expect, it } from "vitest";
import { directionOf, languages } from "../profile/languages";

const page = readFileSync(new URL("../../public/offline.html", import.meta.url), "utf8");

describe("offline page", () => {
  it("has one line in every language saying the assistant needs a connection", () => {
    for (const language of languages) {
      expect(strings.offline[language].trim()).not.toBe("");
    }
  });

  it("shows exactly the strings, each line in its own language and direction", () => {
    const lines = [...page.matchAll(/<p lang="([a-z]+)" dir="(rtl|ltr)">([^<]+)<\/p>/g)].map(
      ([, lang, dir, text]) => [lang, dir, text],
    );

    expect(lines).toEqual(
      languages.map((language) => [language, directionOf(language), strings.offline[language]]),
    );
  });

  it("is a black page with yellow text", () => {
    expect(page).toMatch(/background:\s*#000000/i);
    expect(page).toMatch(/color:\s*#ffe600/i);
  });

  it("loads nothing else, so it works with no connection", () => {
    expect(page).not.toMatch(/<(script|link|img|iframe)\b/);
    expect(page).not.toMatch(/url\(/);
  });
});
