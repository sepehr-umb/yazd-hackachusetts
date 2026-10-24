export const languages = ["fa", "en", "es", "it"] as const;
export type Language = (typeof languages)[number];

export const greetings: Record<Exclude<Language, "fa">, string[]> = {
  en: ["hello", "hi", "hey"],
  es: ["hola", "buenas", "buenos dias"],
  it: ["ciao", "salve", "buongiorno", "pronto"],
};

const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .filter((word) => word !== "");
}

function says(words: string[], greeting: string): boolean {
  const parts = greeting.split(" ");
  return words.some((_, start) => parts.every((part, offset) => words[start + offset] === part));
}

export function detectLanguage(text: string): Language | undefined {
  if (ARABIC_SCRIPT.test(text)) return "fa";
  const words = wordsOf(text);
  const heard = Object.entries(greetings)
    .filter(([, phrases]) => phrases.some((phrase) => says(words, phrase)))
    .map(([language]) => language as Language);
  return heard.length === 1 ? heard[0] : undefined;
}
