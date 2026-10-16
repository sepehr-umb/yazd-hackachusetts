const DIACRITICS_AND_TATWEEL = /[ـً-ٰٟ]/g;
const WORD_SEPARATORS = /[\s‌]+/g;

export const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .replaceAll("ي", "ی")
    .replaceAll("ك", "ک")
    .replace(DIACRITICS_AND_TATWEEL, "")
    .replace(WORD_SEPARATORS, " ")
    .trim();
