import { isLanguageCode } from "@mahmood/contracts";

export function withFallbackLanguage(system: string, code?: string): string {
  if (!isLanguageCode(code)) return system;
  return `${system} Reply in the language the user spoke. If you cannot tell which language that is, reply in ${code}.`;
}
