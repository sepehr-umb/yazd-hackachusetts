import type { AssistantEvent } from "@mahmood/contracts";
import { createSettingsStore } from "../settings/settingsStore";
import { createSpeechPlayer } from "./speechPlayer";
import type { PlaybackContext } from "./speechPlayer";

export function setupSpeechPlayer() {
  const log: string[] = [];
  const destination = { name: "destination" };
  const analyser = {
    fftSize: 1024,
    frequencyBinCount: 4,
    connectedTo: [] as unknown[],
    connect(node: unknown) {
      analyser.connectedTo.push(node);
      return node;
    },
    getByteFrequencyData(bins: Uint8Array) {
      bins.set([10, 20, 30, 40]);
    },
  };
  const sourceNodes: Array<{ element: unknown; connectedTo: unknown[] }> = [];
  const context = {
    sampleRate: 48000,
    destination,
    resume: async () => {
      log.push("resume");
    },
    createAnalyser: () => analyser,
    createMediaElementSource: (element: unknown) => {
      const node = {
        element,
        connectedTo: [] as unknown[],
        connect(target: unknown) {
          node.connectedTo.push(target);
          return target;
        },
      };
      sourceNodes.push(node);
      return node;
    },
  } as unknown as PlaybackContext;
  const audios: Array<{
    src: string;
    preservesPitch: boolean;
    playbackRate: number;
    onended: null | (() => void);
    rateAtPlay: number[];
    plays: number;
    paused: number;
  }> = [];
  const createAudio = () => {
    const audio = {
      src: "",
      preservesPitch: false,
      playbackRate: 1,
      onended: null as null | (() => void),
      rateAtPlay: [] as number[],
      plays: 0,
      paused: 0,
      play: async () => {
        audio.plays += 1;
        audio.rateAtPlay.push(audio.playbackRate);
        log.push("play");
      },
      pause: () => {
        audio.paused += 1;
      },
    };
    audios.push(audio);
    return audio as unknown as HTMLAudioElement;
  };
  const listeners = new Set<(event: AssistantEvent) => void>();
  const events = {
    subscribe(listener: (event: AssistantEvent) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  const settings = createSettingsStore({ events, storage: null });
  const player = createSpeechPlayer({ events, context, settings, createAudio });
  const emit = (event: AssistantEvent) => listeners.forEach((listener) => listener(event));
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
  return { player, emit, settle, log, audios, sourceNodes, analyser, destination, listeners };
}
