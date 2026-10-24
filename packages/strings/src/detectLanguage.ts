export type Language = "fa" | "ar" | "it" | "en";

const arabicScript = /[\u0600-\u06FF]/;
const latinLetter = /[A-Za-z\u00C0-\u00FF]/;
const farsiOnly = /[پچژگکی]/;
const arabicOnly = /[يكةى]/;
const italianAccent = /[àèéìòù]/i;
const italianWords = new Set([
  "il",
  "la",
  "mio",
  "mia",
  "di",
  "che",
  "per",
  "un",
  "una",
  "al",
  "mamma",
  "papà",
  "chiama",
  "manda",
]);

function isItalian(text: string): boolean {
  if (italianAccent.test(text)) return true;
  const words = text.toLowerCase().split(/[^\p{L}]+/u);
  return words.some((word) => italianWords.has(word));
}

export function detectLanguage(text: string): Language {
  const hasArabicScript = arabicScript.test(text);
  const hasLatin = latinLetter.test(text);
  if (hasArabicScript && hasLatin) return "en";
  if (hasArabicScript) {
    if (farsiOnly.test(text)) return "fa";
    return arabicOnly.test(text) ? "ar" : "fa";
  }
  return hasLatin && isItalian(text) ? "it" : "en";
}
