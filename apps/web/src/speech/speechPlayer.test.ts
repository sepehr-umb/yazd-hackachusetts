import { describe, expect, it } from "vitest";
import type { AssistantEvent } from "@mahmood/contracts";
import { createSpeechPlayer } from "./speechPlayer";
import type { PlaybackContext } from "./speechPlayer";

function setup() {
  const log: string[] = [];
  const sources: Array<{ ended(): void; stopped: boolean; connectedTo: unknown[] }> = [];
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
  const context = {
    sampleRate: 48000,
    destination,
    resume: async () => {
      log.push("resume");
    },
    decodeAudioData: async (bytes: ArrayBuffer) => ({ length: bytes.byteLength }),
    createAnalyser: () => analyser,
    createBufferSource: () => {
      const source = {
        buffer: null as unknown,
        stopped: false,
        connectedTo: [] as unknown[],
        onended: null as null | (() => void),
        connect(node: unknown) {
          source.connectedTo.push(node);
          return node;
        },
        start: () => log.push("start"),
        stop: () => {
          source.stopped = true;
        },
        ended: () => source.onended?.(),
      };
      sources.push(source);
      return source;
    },
  } as unknown as PlaybackContext;
  const fetched: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    fetched.push(String(input));
    return new Response(new Uint8Array([1, 2, 3]));
  };
  const listeners = new Set<(event: AssistantEvent) => void>();
  const events = {
    subscribe(listener: (event: AssistantEvent) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  const player = createSpeechPlayer({ events, context, fetch: fetchImpl });
  const emit = (event: AssistantEvent) => listeners.forEach((listener) => listener(event));
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
  return { player, emit, settle, fetched, log, sources, analyser, destination, listeners };
}

describe("createSpeechPlayer", () => {
  it("has no audio frame before anything is spoken", () => {
    expect(setup().player.frame()).toBeNull();
  });

  it("fetches a speech event's audio and plays it through the analyser to the speakers", async () => {
    const { player, emit, settle, fetched, log, sources, analyser, destination } = setup();

    emit({ type: "speech", audioUrl: "/speech/abc" });
    await settle();

    expect(fetched).toEqual(["/speech/abc"]);
    expect(log).toEqual(["resume", "start"]);
    expect(sources[0]?.connectedTo).toEqual([analyser]);
    expect(analyser.connectedTo).toEqual([destination]);
    expect(player.frame()).toEqual({
      bins: new Uint8Array([10, 20, 30, 40]),
      hzPerBin: 48000 / 1024,
    });
  });

  it("has no audio frame again once playback ends", async () => {
    const { player, emit, settle, sources } = setup();
    emit({ type: "speech", audioUrl: "/speech/abc" });
    await settle();

    sources[0]?.ended();

    expect(player.frame()).toBeNull();
  });

  it("stops the previous clip when a new one arrives", async () => {
    const { emit, settle, sources } = setup();
    emit({ type: "speech", audioUrl: "/speech/one" });
    await settle();
    emit({ type: "speech", audioUrl: "/speech/two" });
    await settle();

    expect(sources.map((source) => source.stopped)).toEqual([true, false]);
  });

  it("ignores events that are not speech", async () => {
    const { emit, settle, fetched } = setup();

    emit({ type: "state", state: "thinking" });
    await settle();

    expect(fetched).toEqual([]);
  });

  it("stops listening when disposed", () => {
    const { player, listeners } = setup();

    player.dispose();

    expect(listeners.size).toBe(0);
  });
});
