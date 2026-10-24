const normalize = (text: string) => text.trim().replace(/\s+/g, " ").toLocaleLowerCase();

export function sameCaption(original: string, english: string): boolean {
  return normalize(original) === normalize(english);
}
