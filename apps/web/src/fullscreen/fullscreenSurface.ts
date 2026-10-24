import type { AssistantState } from "@mahmood/contracts";
import { strings } from "@mahmood/strings";
import type { FrameScheduler } from "../companion/companionLoop";
import { prefersReducedMotion } from "../flip/reducedMotion";
import { startFlip } from "../flip/startFlip";
import { onPressOrHold } from "../input/longPress";
import type { Surface } from "../surfaces/surface";
import { onToggleKey } from "../voice/toggleKeys";
import { voiceConfig } from "../voice/voiceConfig";
import type { VoiceConfig } from "../voice/voiceConfig";
import { createVoiceSession } from "../voice/voiceSession";
import { accessState } from "./accessState";
import { createSettingsButton } from "./settingsButton";

export type FullscreenSurfaceDeps = Partial<FrameScheduler> & {
  config?: VoiceConfig;
  reducedMotion?: () => boolean;
};

export function createFullscreenSurface({
  config = voiceConfig,
  reducedMotion = prefersReducedMotion,
  requestFrame = (callback) => requestAnimationFrame(callback),
  cancelFrame = (handle) => cancelAnimationFrame(handle),
}: FullscreenSurfaceDeps = {}): Surface {
  let hinted = false;
  return {
    id: "fullscreen",
    mount(host, context) {
      const document = host.ownerDocument;
      const { profile } = context;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.role = "flip";
      const status = document.createElement("p");
      status.setAttribute("role", "status");
      status.dir = "auto";
      const settings = createSettingsButton(document, context.setup.open);
      host.append(settings, button, status);

      let streamState: AssistantState = "idle";
      let failed = false;

      const render = () => {
        const { language } = profile.get();
        const copy = strings.flip[language];
        const word = copy.status[accessState(session.phase, streamState, failed)];
        if (status.textContent !== word) status.textContent = word;
        status.lang = language;
        button.lang = language;
        button.setAttribute("aria-label", copy.label);
        settings.lang = language;
        settings.textContent = strings.setup[language].settings;
      };

      const session = createVoiceSession({
        context,
        config,
        onPhase: (phase) => {
          if (phase === "starting") failed = false;
          render();
        },
        onNotice: ({ tone }) => {
          if (tone === "error") failed = true;
          render();
        },
      });

      const unsubscribeEvents = context.events.subscribe((event) => {
        if (event.type !== "state") return;
        streamState = event.state;
        render();
      });
      const unsubscribeProfile = profile.subscribe(render);

      const flip = startFlip({
        element: host,
        phase: () => session.phase,
        palette: () => ({ idle: profile.get().flipIdle, listening: profile.get().flipListening }),
        reducedMotion,
        speaking: () => streamState === "speaking",
        speech: context.speech,
        requestFrame,
        cancelFrame,
      });
      const stopPress = onPressOrHold(button, {
        onPress: session.toggle,
        onHold: context.setup.open,
      });
      const stopKeys = onToggleKey(document, session.toggle);
      render();
      if (!hinted) {
        hinted = true;
        const { language } = profile.get();
        context.narrator.say(strings.setup[language].holdHint, language);
      }

      return () => {
        flip.stop();
        stopPress();
        stopKeys();
        session.dispose();
        unsubscribeProfile();
        unsubscribeEvents();
        settings.remove();
        button.remove();
        status.remove();
      };
    },
  };
}

export const fullscreenSurface = createFullscreenSurface();
