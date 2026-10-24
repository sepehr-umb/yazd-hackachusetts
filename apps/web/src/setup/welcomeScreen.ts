import { strings } from "@mahmood/strings";
import { languages } from "../profile/languages";
import type { Haptic } from "../haptics/haptics";
import type { Narrator } from "./narrator";
import { rotateLines } from "./rotatingLine";
import type { Rotation } from "./rotatingLine";
import { startTour } from "./welcomeTour";
import type { Tour } from "./welcomeTour";

export type WelcomeDeps = {
  narrator: Narrator;
  haptic: Haptic;
  reducedMotion: () => boolean;
  onGreet: () => void;
};

export type WelcomeScreen = { element: HTMLButtonElement; show(): void; hide(): void };

const hellos = languages.map((language) => ({
  text: strings.setup[language].sayHello,
  lang: language,
}));

export function createWelcome(document: Document, deps: WelcomeDeps): WelcomeScreen {
  const element = document.createElement("button");
  element.type = "button";
  element.dataset.role = "welcome";
  element.setAttribute("aria-label", hellos.map(({ text }) => text).join(" · "));
  const orb = document.createElement("span");
  orb.dataset.role = "orb";
  orb.setAttribute("aria-hidden", "true");
  const sentence = document.createElement("span");
  sentence.dataset.role = "sentence";
  sentence.dir = "auto";
  sentence.setAttribute("aria-hidden", "true");
  element.append(orb, sentence);

  let toured = false;
  let rotation: Rotation | undefined;
  let tour: Tour | undefined;
  const quiet = () => {
    rotation?.stop();
    tour?.stop();
    rotation = tour = undefined;
  };
  const showLanguage = (language: string) => {
    sentence.lang = language;
    sentence.textContent = hellos.find(({ lang }) => lang === language)?.text ?? "";
  };

  element.addEventListener("contextmenu", (event) => event.preventDefault());
  element.addEventListener("click", () => {
    if (toured) {
      tour?.stop();
      tour = undefined;
      deps.narrator.cancel();
      return deps.onGreet();
    }
    toured = true;
    deps.haptic("start");
    tour = startTour(deps.narrator, showLanguage);
    if (tour) rotation?.stop();
  });

  return {
    element,
    show() {
      quiet();
      toured = false;
      element.hidden = false;
      rotation = rotateLines(sentence, hellos, deps.reducedMotion);
    },
    hide() {
      quiet();
      element.hidden = true;
    },
  };
}
