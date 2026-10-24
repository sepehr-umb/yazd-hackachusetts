import type { RequestFailure } from "@mahmood/contracts";
import { detectLanguage, type Language } from "./detectLanguage";

type Reason = RequestFailure["reason"];

export const apologies: Record<Reason, Record<Language, string>> = {
  llm_error: {
    en: "Sorry, I could not do that. Please try again in a moment.",
    it: "Mi dispiace, non ci sono riuscito. Riprova tra poco.",
    fa: "متأسفم، نتوانستم انجامش بدهم. لطفاً کمی بعد دوباره امتحان کنید.",
    ar: "عذراً، لم أستطع تنفيذ ذلك. حاول مرة أخرى بعد قليل.",
  },
  too_many_steps: {
    en: "Sorry, that took too long. Please try again.",
    it: "Mi dispiace, ci è voluto troppo tempo. Riprova, per favore.",
    fa: "متأسفم، این کار خیلی طول کشید. لطفاً دوباره امتحان کنید.",
    ar: "عذراً، استغرق الأمر وقتاً طويلاً. حاول مرة أخرى من فضلك.",
  },
  unroutable: {
    en: "Sorry, I did not understand. Could you say it another way?",
    it: "Mi dispiace, non ho capito. Puoi dirlo in un altro modo?",
    fa: "متأسفم، متوجه نشدم. لطفاً طور دیگری بگویید.",
    ar: "عذراً، لم أفهم. هل يمكنك قولها بطريقة أخرى؟",
  },
  invalid_tool_call: {
    en: "Sorry, I cannot do that. Please try asking another way.",
    it: "Mi dispiace, non posso farlo. Prova a chiederlo in un altro modo.",
    fa: "متأسفم، نمی‌توانم این کار را انجام دهم. لطفاً طور دیگری بگویید.",
    ar: "عذراً، لا أستطيع فعل ذلك. حاول أن تطلبها بطريقة أخرى.",
  },
  tool_failed: {
    en: "Sorry, that did not work. Please try again.",
    it: "Mi dispiace, non ha funzionato. Riprova, per favore.",
    fa: "متأسفم، نشد. لطفاً دوباره امتحان کنید.",
    ar: "عذراً، لم ينجح ذلك. حاول مرة أخرى من فضلك.",
  },
};

const supportedLanguages: readonly string[] = ["fa", "ar", "it", "en"];
const hasLetter = /\p{L}/u;

function apologyLanguage(requestText: string, preferredLanguage?: string): Language {
  if (!hasLetter.test(requestText) && preferredLanguage && supportedLanguages.includes(preferredLanguage)) {
    return preferredLanguage as Language;
  }
  return detectLanguage(requestText);
}

export function friendlyApology(
  failure: RequestFailure,
  requestText: string,
  preferredLanguage?: string,
): string {
  return apologies[failure.reason][apologyLanguage(requestText, preferredLanguage)];
}
