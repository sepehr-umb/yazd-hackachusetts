import type { Language } from "../profile/languages";

export type SetupOption = {
  text: string;
  language: Language;
  onFocus?: () => void;
  onChoose: () => void;
};

export function optionButtons(document: Document, options: SetupOption[]): HTMLButtonElement[] {
  return options.map(({ text, language, onFocus, onChoose }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.lang = language;
    button.dir = "auto";
    button.textContent = text;
    if (onFocus) button.addEventListener("focus", onFocus);
    button.addEventListener("click", onChoose);
    return button;
  });
}
