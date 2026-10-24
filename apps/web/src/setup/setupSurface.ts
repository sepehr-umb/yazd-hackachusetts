import { strings } from "@mahmood/strings";
import { prefersReducedMotion } from "../flip/reducedMotion";
import { languages } from "../profile/languages";
import type { Language } from "../profile/languages";
import type { Vision } from "../profile/profile";
import { createTranscribeClient } from "../request/transcribeClient";
import type { TranscribeClient } from "../request/transcribeClient";
import type { Surface } from "../surfaces/surface";
import { voiceConfig } from "../voice/voiceConfig";
import type { VoiceConfig } from "../voice/voiceConfig";
import { createVoiceSession } from "../voice/voiceSession";
import { rotateLines } from "./rotatingLine";
import type { Rotation } from "./rotatingLine";
import { didNotCatchLines } from "./didNotCatchLines";
import { languageOptions, optionButtons } from "./setupOptions";
import { createSetupSheet } from "./setupSheet";
import { trackSheetHistory } from "./sheetHistory";
import { visionOptions } from "./visionOptions";
import { createVoiceFlow } from "./voiceFlow";

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
  transcribe = createTranscribeClient(),
  config = voiceConfig,
  reducedMotion = prefersReducedMotion,
}: SetupSurfaceDeps = {}): Surface {
  return {
    id: "setup",
    mount(host, context) {
      const document = host.ownerDocument;
      const { profile, narrator } = context;
      const { sheet, orb, heading, list, show } = createSetupSheet(
        document,
        hellos.map(({ text }) => text).join(" · "),
      );
      host.append(sheet);
      let rotation: Rotation | undefined;
      const stopRotating = () => {
        rotation?.stop();
        rotation = undefined;
      };
      const session = createVoiceSession({
        context,
        config,
        onPhase: (phase) => {
          orb.dataset.listening = String(phase === "recording");
        },
      });
      const history = trackSheetHistory(context.setup.history, () => {
        if (!profile.get().vision) return history.opened();
        flow.cancel();
        stopRotating();
        sheet.hidden = true;
      });
      const close = () => {
        flow.cancel();
        stopRotating();
        sheet.hidden = true;
        history.closed();
      };
      const choose = (chosen: Language, vision: Vision) => {
        close();
        narrator.say(strings.setup[chosen].confirmation, chosen);
        profile.update({ language: chosen, vision });
      };
      const showVision = (chosen: Language, heard: boolean) => {
        const copy = strings.setup[chosen];
        stopRotating();
        sheet.dataset.step = "vision";
        show(chosen, copy.visionQuestion);
        const options = visionOptions(chosen, narrator, (vision) => choose(chosen, vision));
        list.replaceChildren(...optionButtons(document, options));
        heading.focus();
        if (heard) narrator.say(copy.heard, chosen);
        flow.ask(chosen);
      };
      const flow = createVoiceFlow({
        session,
        transcribe,
        narrator,
        onLanguage: (heard) => {
          if (!heard) return showFallback();
          profile.update({ language: heard });
          showVision(heard, true);
        },
        onVision: choose,
      });
      const showWelcome = () => {
        sheet.dataset.step = "welcome";
        stopRotating();
        list.replaceChildren();
        rotation = rotateLines(heading, hellos, reducedMotion);
      };
      const showFallback = () => {
        sheet.dataset.step = "fallback";
        stopRotating();
        heading.removeAttribute("lang");
        heading.replaceChildren(...didNotCatchLines(document));
        const options = languageOptions((choice) => {
          flow.cancel();
          profile.update({ language: choice });
          showVision(choice, false);
        });
        list.replaceChildren(...optionButtons(document, options));
      };
      orb.addEventListener("click", () => {
        if (sheet.dataset.step !== "vision") flow.greet();
        else flow.answer(profile.get().language);
      });
      const open = () => {
        flow.cancel();
        const { vision, language: current } = profile.get();
        if (vision) showVision(current, false);
        else showWelcome();
        sheet.hidden = false;
        history.opened();
        heading.focus();
      };
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape" && profile.get().vision && !sheet.hidden) close();
      };
      const stopOpening = context.setup.onOpen(open);
      document.addEventListener("keydown", onKeyDown);
      if (!profile.get().vision) open();
      return () => {
        stopOpening();
        stopRotating();
        flow.cancel();
        session.dispose();
        history.stop();
        document.removeEventListener("keydown", onKeyDown);
        sheet.remove();
      };
    },
  };
}

export const setupSurface = createSetupSurface();
