const DIACRITICS_AND_TATWEEL = /[ـً-ٰٟ]/g;

export const normalizeText = (text: string): string =>
  text.replaceAll("ي", "ی").replaceAll("ك", "ک").replace(DIACRITICS_AND_TATWEEL, "");
