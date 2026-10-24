import type { Language } from "../profile/languages";
import type { Vision } from "../profile/profile";

export type AnswerWords = { numbers: Record<Vision, string[]>; keywords: Record<Vision, string[]> };

export const visionAnswers: Record<Language, AnswerWords> = {
  fa: {
    numbers: { full: ["1", "یک", "اول"], low: ["2", "دو", "دوم"], minimal: ["3", "سه", "سوم"] },
    keywords: { full: ["خوب"], low: ["شکل", "رنگ"], minimal: ["سختی", "بهسختی"] },
  },
  en: {
    numbers: {
      full: ["1", "one", "first"],
      low: ["2", "two", "second"],
      minimal: ["3", "three", "third"],
    },
    keywords: {
      full: ["well"],
      low: ["shapes", "colors", "colours"],
      minimal: ["barely", "hardly"],
    },
  },
  es: {
    numbers: {
      full: ["1", "uno", "primero"],
      low: ["2", "dos", "segundo"],
      minimal: ["3", "tres", "tercero"],
    },
    keywords: { full: ["bien"], low: ["formas", "colores"], minimal: ["apenas"] },
  },
  it: {
    numbers: {
      full: ["1", "uno", "primo"],
      low: ["2", "due", "secondo"],
      minimal: ["3", "tre", "terzo"],
    },
    keywords: { full: ["bene"], low: ["forme", "colori"], minimal: ["malapena"] },
  },
};
