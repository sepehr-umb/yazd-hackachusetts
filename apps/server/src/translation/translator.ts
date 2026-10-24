export interface Translator {
  toEnglish(text: string): Promise<string>;
}
