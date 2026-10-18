import type { AssistantEventSource } from "../events/assistantEventSource";
import type { AudioFrame } from "../face/faceAnimator";

export type PlaybackContext = Pick<
  AudioContext,
  | "sampleRate"
  | "destination"
  | "resume"
  | "decodeAudioData"
  | "createAnalyser"
  | "createBufferSource"
>;

export type SpeechPlayerConfig = {
  events: AssistantEventSource;
  context: PlaybackContext;
  fetch?: typeof fetch;
};

export type SpeechPlayer = { frame(): AudioFrame | null; dispose(): void };

export function createSpeechPlayer({
  events,
  context,
  fetch: fetchImpl = (input, init) => fetch(input, init),
}: SpeechPlayerConfig): SpeechPlayer {
  const analyser = context.createAnalyser();
  analyser.connect(context.destination);
  const bins = new Uint8Array(analyser.frequencyBinCount);
  let current: AudioBufferSourceNode | undefined;
  let latest = 0;

  const play = async (audioUrl: string) => {
    const ticket = ++latest;
    const bytes = await (await fetchImpl(audioUrl)).arrayBuffer();
    const buffer = await context.decodeAudioData(bytes);
    if (ticket !== latest) return;
    await context.resume();
    current?.stop();
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(analyser);
    source.onended = () => {
      if (current === source) current = undefined;
    };
    current = source;
    source.start();
  };

  const unsubscribe = events.subscribe((event) => {
    if (event.type !== "speech") return;
    play(event.audioUrl).catch((error: unknown) => console.error(error));
  });

  return {
    frame() {
      if (!current) return null;
      analyser.getByteFrequencyData(bins);
      return { bins, hzPerBin: context.sampleRate / analyser.fftSize };
    },
    dispose: unsubscribe,
  };
}
