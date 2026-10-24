import type { AssistantState } from "@mahmood/contracts";
import { strings } from "@mahmood/strings";
import type { Surface } from "../surfaces/surface";
import { onToggleKey } from "../voice/toggleKeys";
import { voiceConfig } from "../voice/voiceConfig";
import type { VoiceConfig } from "../voice/voiceConfig";
import { createVoiceSession } from "../voice/voiceSession";
import type { FrameScheduler } from "./companionLoop";
import { companionState } from "./companionState";
import { mountOrb } from "./mountOrb";

export type CompanionSurfaceDeps = Partial<FrameScheduler> & { config?: VoiceConfig };

export function createCompanionSurface({
  config = voiceConfig,
  requestFrame = (callback) => requestAnimationFrame(callback),
  cancelFrame = (handle) => cancelAnimationFrame(handle),
}: CompanionSurfaceDeps = {}): Surface {
  return {
    id: "companion",
    mount(host, context) {
      const document = host.ownerDocument;
      const button = document.createElement("button");
      button.type = "button";
      const status = document.createElement("p");
      status.setAttribute("role", "status");
      status.dir = "auto";
      host.append(button, status);

      let streamState: AssistantState = "idle";
      const unsubscribe = context.events.subscribe((event) => {
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
        button.setAttribute(
          "aria-label",
          phase === "recording" ? strings.companion.stop : strings.companion.talk,
        );
        button.dataset.phase = phase;
        button.setAttribute("aria-disabled", String(phase === "sending"));
      };

      const unmountCharacter = mountOrb(button, {
        shownState: () => companionState(session.phase, streamState),
        micLevel: session.level,
        speech: context.speech,
        requestFrame,
        cancelFrame,
      });

      button.addEventListener("click", session.toggle);
      const stopKeys = onToggleKey(document, session.toggle);
      render();

      return () => {
        unmountCharacter();
        session.dispose();
        stopKeys();
        unsubscribe();
        button.remove();
        status.remove();
      };
    },
  };
}

export const companionSurface = createCompanionSurface();
