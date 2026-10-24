import type { AssistantEventSource } from "../events/assistantEventSource";
import type { AudioFrame } from "../face/faceAnimator";
import type { SettingsStore } from "../settings/settingsStore";

export type PlaybackContext = Pick<
  AudioContext,
  "sampleRate" | "destination" | "resume" | "createAnalyser" | "createMediaElementSource"
>;

export type SpeechPlayerConfig = {
  events: AssistantEventSource;
  context: PlaybackContext;
  settings: Pick<SettingsStore, "get">;
  createAudio?: () => HTMLAudioElement;
};

export type SpeechPlayer = { frame(): AudioFrame | null; dispose(): void };

export function createSpeechPlayer({
  events,
  context,
  settings,
  createAudio = () => new Audio(),
}: SpeechPlayerConfig): SpeechPlayer {
  const analyser = context.createAnalyser();
  analyser.connect(context.destination);
  const bins = new Uint8Array(analyser.frequencyBinCount);
  const audio = createAudio();
  context.createMediaElementSource(audio).connect(analyser);
  let playing = false;
  let latest = 0;

  audio.onended = () => {
    playing = false;
  };

  const play = async (audioUrl: string) => {
    const ticket = ++latest;
    await context.resume();
    if (ticket !== latest) return;
    audio.pause();
    audio.src = audioUrl;
    audio.preservesPitch = true;
    audio.playbackRate = settings.get().speechRate;
    playing = true;
    await audio.play();
  };

  const unsubscribe = events.subscribe((event) => {
    if (event.type !== "speech") return;
    play(event.audioUrl).catch((error: unknown) => console.error(error));
  });

  return {
    frame() {
      if (!playing) return null;
      analyser.getByteFrequencyData(bins);
      return { bins, hzPerBin: context.sampleRate / analyser.fftSize };
    },
    dispose() {
      unsubscribe();
      audio.pause();
    },
  };
}
