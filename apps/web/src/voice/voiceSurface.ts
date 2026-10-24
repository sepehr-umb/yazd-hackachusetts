import { strings } from "@mahmood/strings";
import type { Surface } from "../surfaces/surface";
import { onToggleKey } from "./toggleKeys";
import { voiceConfig } from "./voiceConfig";
import type { VoiceConfig } from "./voiceConfig";
import { createVoiceSession } from "./voiceSession";

export type VoiceSurfaceDeps = { config?: VoiceConfig };

export function createVoiceSurface({ config = voiceConfig }: VoiceSurfaceDeps = {}): Surface {
  return {
    id: "voice",
    mount(host, context) {
      const document = host.ownerDocument;
      const button = document.createElement("button");
      button.type = "button";
      const status = document.createElement("p");
      status.setAttribute("role", "status");
      status.dir = "auto";
      host.append(button, status);

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
          phase === "recording" ? strings.voice.stop : strings.voice.start,
        );
        button.dataset.phase = phase;
        button.disabled = phase === "sending";
      };

      button.addEventListener("click", session.toggle);
      const stopKeys = onToggleKey(document, session.toggle);
      render();

      return () => {
        session.dispose();
        stopKeys();
        button.remove();
        status.remove();
      };
    },
  };
}

export const voiceSurface = createVoiceSurface();
