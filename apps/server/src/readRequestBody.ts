import { isLanguageCode, languageHeader } from "@mahmood/contracts";

export function readText(body: unknown): string | undefined {
  const text = (body as { text?: unknown } | null)?.text;
  return typeof text === "string" && text.trim() !== "" ? text.trim() : undefined;
}

function validLanguage(value: unknown): string | undefined {
  return isLanguageCode(value) ? value : undefined;
}

export function readLanguage(body: unknown): string | undefined {
  return validLanguage((body as { language?: unknown } | null)?.language);
}

export function readLanguageHeader(headers: Record<string, unknown>): string | undefined {
  const value = headers[languageHeader];
  return validLanguage(Array.isArray(value) ? value[0] : value);
}
