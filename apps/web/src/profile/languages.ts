import type { strings } from "@mahmood/strings";

export const languages = [
  "fa",
  "en",
  "es",
  "it",
] as const satisfies readonly (keyof typeof strings.setup)[];
export type Language = (typeof languages)[number];

const rightToLeft: readonly Language[] = ["fa"];

export function isLanguage(value: unknown): value is Language {
  return languages.some((language) => language === value);
}

export function directionOf(language: Language): "rtl" | "ltr" {
  return rightToLeft.includes(language) ? "rtl" : "ltr";
}
