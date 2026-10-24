import { strings } from "@mahmood/strings";
import { languages } from "../profile/languages";

export function didNotCatchLines(document: Document): HTMLSpanElement[] {
  return languages.map((language) => {
    const line = document.createElement("span");
    line.dataset.role = "line";
    line.lang = language;
    line.dir = "auto";
    line.textContent = strings.setup[language].didNotCatch;
    return line;
  });
}
