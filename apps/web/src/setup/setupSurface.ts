import { strings } from "@mahmood/strings";
import { languages } from "../profile/languages";
import type { Language } from "../profile/languages";
import { visions } from "../profile/profile";
import type { Vision } from "../profile/profile";
import { prefersReducedMotion } from "../flip/reducedMotion";
import type { TranscribeClient } from "../request/transcribeClient";
import type { Surface } from "../surfaces/surface";
import type { VoiceConfig } from "../voice/voiceConfig";
import { rotateLines } from "./rotatingLine";
import type { Rotation } from "./rotatingLine";
import { optionButtons } from "./setupOptions";
import { trackSheetHistory } from "./sheetHistory";

export type SetupSurfaceDeps = {
  transcribe?: TranscribeClient;
  config?: VoiceConfig;
  reducedMotion?: () => boolean;
};

const hellos = languages.map((language) => ({
  text: strings.setup[language].sayHello,
  lang: language,
}));

export function createSetupSurface({
  reducedMotion = prefersReducedMotion,
}: SetupSurfaceDeps = {}): Surface {
  return {
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
      const orb = document.createElement("button");
      orb.type = "button";
      orb.dataset.role = "orb";
      orb.setAttribute("aria-label", hellos.map(({ text }) => text).join(" · "));
      let rotation: Rotation | undefined;
      const stopRotating = () => {
        rotation?.stop();
        rotation = undefined;
      };
      sheet.append(orb, heading, list);
      host.append(sheet);

      const show = (language: Language, title: string) => {
        heading.lang = language;
        heading.textContent = title;
      };

      const history = trackSheetHistory(context.setup.history, () => {
        if (profile.get().vision) sheet.hidden = true;
        else history.opened();
      });

      const close = () => {
        stopRotating();
        sheet.hidden = true;
        history.closed();
      };

      const choose = (language: Language, vision: Vision) => {
        narrator.stop();
        narrator.say(strings.setup[language].confirmation, language);
        close();
        profile.update({ language, vision });
      };

      const showVision = (language: Language) => {
        const copy = strings.setup[language];
        stopRotating();
        sheet.dataset.step = "vision";
        show(language, copy.visionQuestion);
        const options = visions.map((vision) => ({
          text: copy.vision[vision],
          detail: copy.visionDetail[vision],
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
        sheet.dataset.step = "welcome";
        stopRotating();
        rotation = rotateLines(heading, hellos, reducedMotion);
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
        history.opened();
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
        stopRotating();
        history.stop();
        document.removeEventListener("keydown", onKeyDown);
        sheet.remove();
      };
    },
  };
}

export const setupSurface = createSetupSurface();
