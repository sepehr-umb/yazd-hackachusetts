import { strings } from "@mahmood/strings";
import { languages } from "../profile/languages";
import type { Language } from "../profile/languages";
import { visions } from "../profile/profile";
import type { Vision } from "../profile/profile";
import type { Surface } from "../surfaces/surface";
import { optionButtons } from "./setupOptions";

export const setupSurface: Surface = {
  id: "setup",
  mount(host, context) {
    const document = host.ownerDocument;
    const { profile, narrator } = context;
    const sheet = document.createElement("div");
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.hidden = true;
    const heading = document.createElement("h2");
    heading.id = "setup-heading";
    heading.tabIndex = -1;
    heading.dir = "auto";
    sheet.setAttribute("aria-labelledby", heading.id);
    const list = document.createElement("div");
    list.dataset.role = "options";
    sheet.append(heading, list);
    host.append(sheet);

    const show = (language: Language, title: string) => {
      heading.lang = language;
      heading.textContent = title;
    };

    const close = () => {
      sheet.hidden = true;
    };

    const choose = (language: Language, vision: Vision) => {
      narrator.stop();
      narrator.say(strings.setup[language].confirmation, language);
      close();
      profile.update({ language, vision });
    };

    const showVision = (language: Language) => {
      const copy = strings.setup[language];
      show(language, copy.visionQuestion);
      const options = visions.map((vision) => ({
        text: copy.vision[vision],
        language,
        onFocus: () => {
          narrator.stop();
          narrator.say(copy.vision[vision], language);
        },
        onChoose: () => choose(language, vision),
      }));
      list.replaceChildren(...optionButtons(document, options));
      narrator.stop();
      narrator.say(copy.visionQuestion, language);
      options.forEach(({ text }) => narrator.say(text, language));
      heading.focus();
    };

    const showLanguages = () => {
      const current = profile.get().language;
      show(current, strings.setup[current].chooseLanguage);
      const options = languages.map((language) => ({
        text: strings.setup[language].languageName,
        language,
        onChoose: () => showVision(language),
      }));
      list.replaceChildren(...optionButtons(document, options));
    };

    const open = () => {
      showLanguages();
      sheet.hidden = false;
      heading.focus();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && profile.get().vision) close();
    };

    const stopOpening = context.setup.onOpen(open);
    document.addEventListener("keydown", onKeyDown);
    if (!profile.get().vision) open();

    return () => {
      stopOpening();
      document.removeEventListener("keydown", onKeyDown);
      sheet.remove();
    };
  },
};
