import { eventsUrl } from "./events/eventsUrl";
import { createLiveEventSource } from "./events/liveEventSource";
import { createRecordingClient } from "./request/recordingClient";
import { createRequestClient } from "./request/requestClient";
import { createSettingsStore } from "./settings/settingsStore";
import { createSpeechPlayer } from "./speech/speechPlayer";
import { mountSurfaces } from "./surfaces/mountSurfaces";
import { defaultSettings, surfaceRegistry } from "./surfaces/registry";
import { playChime } from "./voice/chime";
import { createMicrophone } from "./voice/microphone";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Page markup is missing #app");

const audioContext = new AudioContext();
const events = createLiveEventSource({ url: eventsUrl(location) });
const settings = createSettingsStore({ events, storage: localStorage });
const speech = createSpeechPlayer({ events, context: audioContext, settings });
const microphone = createMicrophone({
  context: audioContext,
  getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
  createRecorder: (stream) => new MediaRecorder(stream),
});

mountSurfaces({
  registry: surfaceRegistry,
  settings: defaultSettings,
  root,
  context: {
    events,
    requests: createRequestClient(),
    recordings: createRecordingClient(),
    microphone,
    chime: (kind) => playChime(audioContext, kind),
    speech,
    settings,
  },
});

events.start();
