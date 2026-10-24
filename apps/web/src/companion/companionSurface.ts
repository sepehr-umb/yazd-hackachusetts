import type { AssistantState } from "@mahmood/contracts";
import { strings } from "@mahmood/strings";
import type { Character } from "../characters/character";
import { characterFor, characterRegistry } from "../characters/registry";
import { prefersReducedMotion } from "../flip/reducedMotion";
import { onPressOrHold } from "../input/longPress";
import type { Surface, Unmount } from "../surfaces/surface";
import { onToggleKey } from "../voice/toggleKeys";
import { voiceConfig } from "../voice/voiceConfig";
import type { VoiceConfig } from "../voice/voiceConfig";
import { createVoiceSession } from "../voice/voiceSession";
import type { FrameScheduler } from "./companionLoop";
import { companionState } from "./companionState";
import { mountLowVision } from "./lowVision";

export type CompanionSurfaceDeps = Partial<FrameScheduler> & {
  config?: VoiceConfig;
  characters?: Character[];
  reducedMotion?: () => boolean;
};

export function createCompanionSurface({
  config = voiceConfig,
  characters = characterRegistry,
  reducedMotion = prefersReducedMotion,
  requestFrame = (callback) => requestAnimationFrame(callback),
  cancelFrame = (handle) => cancelAnimationFrame(handle),
}: CompanionSurfaceDeps = {}): Surface {
  return {
    id: "companion",
    mount(host, context) {
      const document = host.ownerDocument;
      const { profile } = context;
      const button = document.createElement("button");
      button.type = "button";
      const hint = document.createElement("p");
      hint.dataset.role = "hint";
      hint.dir = "auto";
      hint.setAttribute("aria-hidden", "true");
      const status = document.createElement("p");
      status.setAttribute("role", "status");
      status.dir = "auto";
      host.append(button, hint, status);

      let streamState: AssistantState = "idle";
      const unsubscribeEvents = context.events.subscribe((event) => {
        if (event.type === "state") streamState = event.state;
      });

      const session = createVoiceSession({
        context,
        config,
        onPhase: () => render(),
        onNotice: ({ text, tone }) => {
          status.textContent = text;
          status.dataset.tone = tone;
        },
      });

      const render = () => {
        const { phase } = session;
        const label =
          phase === "recording"
            ? strings.companion.stop
            : strings.companion.talkTo(profile.get().name);
        button.setAttribute("aria-label", label);
        button.dataset.phase = phase;
        button.setAttribute("aria-disabled", String(phase === "sending"));
        const { language } = profile.get();
        const copy = strings.flip[language];
        hint.lang = language;
        hint.textContent =
          phase === "recording"
            ? copy.status.listening
            : phase === "sending"
              ? copy.status.thinking
              : copy.tapToTalk;
      };

      const env = {
        shownState: () => companionState(session.phase, streamState),
        micLevel: session.level,
        speech: context.speech,
        profile,
        requestFrame,
        cancelFrame,
      };
      let mountedId = "";
      let unmountCharacter: Unmount = () => {};
      const showCharacter = () => {
        const character = characterFor(characters, profile.get().character);
        if (character.id === mountedId) return;
        unmountCharacter();
        mountedId = character.id;
        unmountCharacter = character.mount(button, env);
      };
      const unsubscribeProfile = profile.subscribe(() => {
        showCharacter();
        render();
      });
      showCharacter();

      const low = profile.get().vision === "low";
      const stopPress = onPressOrHold(button, {
        onPress: session.toggle,
        onHold: low ? context.setup.open : undefined,
      });
      const unmountLow = low
        ? mountLowVision({
            host,
            button,
            session,
            profile,
            reducedMotion,
            requestFrame,
            cancelFrame,
          })
        : () => {};
      const stopKeys = onToggleKey(document, session.toggle);
      render();

      return () => {
        unmountLow();
        stopPress();
        unmountCharacter();
        unsubscribeProfile();
        session.dispose();
        stopKeys();
        unsubscribeEvents();
        button.remove();
        hint.remove();
        status.remove();
      };
    },
  };
}

export const companionSurface = createCompanionSurface();
