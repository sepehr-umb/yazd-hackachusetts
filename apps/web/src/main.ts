import { eventsUrl } from "./events/eventsUrl";
import { createLiveEventSource } from "./events/liveEventSource";
import { createHaptics } from "./haptics/haptics";
import { applyProfile } from "./profile/applyProfile";
import { browserStorage, createProfileStore } from "./profile/profileStore";
import { createRecordingClient } from "./request/recordingClient";
import { createRequestClient } from "./request/requestClient";
import { createNarrator } from "./setup/narrator";
import { createSetupControl } from "./setup/setupControl";
import { createSpeechPlayer } from "./speech/speechPlayer";
import { mountForProfile } from "./surfaces/mountForProfile";
import { surfaceRegistry } from "./surfaces/registry";
import { settingsFor } from "./surfaces/settingsFor";
import { playChime } from "./voice/chime";
import { createMicrophone } from "./voice/microphone";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Page markup is missing #app");

type ViteMeta = ImportMeta & { env: { DEV: boolean } };

const debug =
  (import.meta as ViteMeta).env.DEV || new URLSearchParams(location.search).has("debug");
const audioContext = new AudioContext();
const events = createLiveEventSource({ url: eventsUrl(location) });
const speech = createSpeechPlayer({ events, context: audioContext });
const microphone = createMicrophone({
  context: audioContext,
  getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
  createRecorder: (stream) => new MediaRecorder(stream),
});
const profile = createProfileStore(browserStorage(() => localStorage));
applyProfile(document, profile.get());
profile.subscribe((next) => applyProfile(document, next));

mountForProfile({
  registry: surfaceRegistry,
  settingsFor: (current) => settingsFor(current, { debug }),
  root,
  context: {
    events,
    requests: createRequestClient(),
    recordings: createRecordingClient(),
    microphone,
    chime: (kind) => playChime(audioContext, kind),
    haptic: createHaptics({
      document,
      vibrate:
        typeof navigator.vibrate === "function"
          ? (pattern) => navigator.vibrate(pattern)
          : undefined,
      supportsSwitch: "switch" in HTMLInputElement.prototype,
    }),
    speech,
    profile,
    setup: createSetupControl({
      push: () => history.pushState({ yazdSetup: true }, ""),
      back: () => history.back(),
      onPop: (listener) => {
        window.addEventListener("popstate", listener);
        return () => window.removeEventListener("popstate", listener);
      },
    }),
    narrator: createNarrator(
      "speechSynthesis" in window
        ? {
            synth: window.speechSynthesis,
            createUtterance: (text) => new SpeechSynthesisUtterance(text),
          }
        : {},
    ),
  },
});

events.start();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => undefined);
}
