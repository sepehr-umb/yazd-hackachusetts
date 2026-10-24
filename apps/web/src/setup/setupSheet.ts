import type { Language } from "../profile/languages";

export type SetupSheet = {
  sheet: HTMLDivElement;
  orb: HTMLButtonElement;
  heading: HTMLHeadingElement;
  list: HTMLDivElement;
  show(language: Language, title: string): void;
  setStep(step: "welcome" | "vision" | "fallback"): void;
};

export function createSetupSheet(document: Document, orbLabel: string): SetupSheet {
  const sheet = document.createElement("div");
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.hidden = true;
  const orb = document.createElement("button");
  orb.type = "button";
  orb.dataset.role = "orb";
  orb.setAttribute("aria-label", orbLabel);
  orb.addEventListener("contextmenu", (event) => event.preventDefault());
  const heading = document.createElement("h2");
  heading.id = "setup-heading";
  heading.tabIndex = -1;
  heading.dir = "auto";
  sheet.setAttribute("aria-labelledby", heading.id);
  const list = document.createElement("div");
  list.dataset.role = "options";
  sheet.append(orb, heading, list);
  return {
    sheet,
    orb,
    heading,
    list,
    show(language, title) {
      heading.lang = language;
      heading.textContent = title;
    },
    setStep(step) {
      sheet.dataset.step = step;
      for (const part of [orb, heading, list]) part.hidden = step === "welcome";
    },
  };
}
