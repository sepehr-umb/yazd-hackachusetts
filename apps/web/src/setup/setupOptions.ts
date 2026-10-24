import type { Language } from "../profile/languages";

export type SetupOption = {
  text: string;
  detail?: string;
  language: Language;
  onFocus?: () => void;
  onChoose: () => void;
};

export function optionButtons(document: Document, options: SetupOption[]): HTMLButtonElement[] {
  return options.map(({ text, detail, language, onFocus, onChoose }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.lang = language;
    button.dir = "auto";
    const title = document.createElement("span");
    title.dataset.role = "title";
    title.textContent = text;
    button.append(title);
    if (detail) {
      const line = document.createElement("span");
      line.dataset.role = "detail";
      line.textContent = detail;
      button.append(line);
    }
    if (onFocus) button.addEventListener("focus", onFocus);
    button.addEventListener("click", onChoose);
    button.addEventListener("contextmenu", (event) => event.preventDefault());
    return button;
  });
}
