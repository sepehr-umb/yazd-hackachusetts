import { describe, expect, it } from "vitest";
import { createMicrophone } from "./microphone";
import type { MicrophoneDeps } from "./microphone";

function setup() {
  const log: string[] = [];
  const track = { stop: () => log.push("track stop") };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  const recorder = {
    mimeType: "audio/webm;codecs=opus",
    ondataavailable: null as null | ((event: { data: Blob }) => void),
    onstop: null as null | (() => void),
    start: () => log.push("recorder start"),
    stop() {
      log.push("recorder stop");
      recorder.ondataavailable?.({ data: new Blob(["ab"]) });
      recorder.ondataavailable?.({ data: new Blob(["cd"]) });
      recorder.onstop?.();
    },
  };
  let samples = new Uint8Array([128, 128]);
  const source = {
    connect: (node: unknown) => node,
    disconnect: () => log.push("source disconnect"),
  };
  const analyser = {
    fftSize: 2,
    getByteTimeDomainData: (out: Uint8Array) => out.set(samples),
  };
  const context = {
    resume: async () => {
      log.push("resume");
    },
    createMediaStreamSource: () => source,
    createAnalyser: () => analyser,
  } as unknown as MicrophoneDeps["context"];
  const requested: unknown[] = [];
  const deps: MicrophoneDeps = {
    context,
    getUserMedia: async (constraints) => {
      requested.push(constraints);
      return stream;
    },
    createRecorder: () => recorder as unknown as MediaRecorder,
  };
  return { deps, log, requested, setSamples: (next: number[]) => (samples = new Uint8Array(next)) };
}

describe("createMicrophone", () => {
  it("resumes audio, asks for the microphone and starts recording", async () => {
    const { deps, log, requested } = setup();

    await createMicrophone(deps).start();

    expect(requested).toEqual([{ audio: true }]);
    expect(log).toEqual(["resume", "recorder start"]);
  });

  it("reports the current input level", async () => {
    const { deps, setSamples } = setup();
    const recording = await createMicrophone(deps).start();

    expect(recording.level()).toBe(0);
    setSamples([192, 64]);
    expect(recording.level()).toBeCloseTo(0.5);
  });

  it("stops everything and returns the recorded audio with its type", async () => {
    const { deps, log } = setup();
    const recording = await createMicrophone(deps).start();

    const blob = await recording.stop();

    expect(blob.type).toBe("audio/webm;codecs=opus");
    expect(await blob.text()).toBe("abcd");
    expect(log).toEqual([
      "resume",
      "recorder start",
      "recorder stop",
      "track stop",
      "source disconnect",
    ]);
  });

  it("rejects when the microphone is refused", async () => {
    const { deps } = setup();
    deps.getUserMedia = async () => {
      throw new Error("Permission denied");
    };

    await expect(createMicrophone(deps).start()).rejects.toThrow("Permission denied");
  });
});
