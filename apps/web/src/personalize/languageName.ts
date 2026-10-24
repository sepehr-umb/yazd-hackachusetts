import type { Shortcut } from "../shortcuts/shortcuts";

export function languagesOf(shortcuts: Shortcut[]): string[] {
  return [...new Set(shortcuts.flatMap((shortcut) => Object.keys(shortcut.text)))];
}

export function languageName(code: string): string {
  try {
    return new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}
