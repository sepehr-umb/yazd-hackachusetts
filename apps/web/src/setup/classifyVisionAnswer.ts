import type { Language } from "../profile/languages";
import { visions } from "../profile/profile";
import type { Vision } from "../profile/profile";
import { visionAnswers } from "./visionAnswers";

const EASTERN_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g;

function wordsOf(text: string): string[] {
  return text
    .replace(EASTERN_DIGITS, (digit) => String((digit.charCodeAt(0) - 0x0660) % 0x90))
    .replace(/\u200C/g, " ")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== "");
}

function only(words: string[], table: Record<Vision, string[]>): Vision | undefined {
  const heard = visions.filter((vision) => table[vision].some((word) => words.includes(word)));
  return heard.length === 1 ? heard[0] : undefined;
}

export function classifyVisionAnswer(text: string, language: Language): Vision | undefined {
  const words = wordsOf(text);
  const { numbers, keywords } = visionAnswers[language];
  return only(words, numbers) ?? only(words, keywords);
}
