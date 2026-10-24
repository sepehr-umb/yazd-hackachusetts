import { strings } from "@mahmood/strings";
import type { EventDescription } from "../activity/describeEvent";
import type { SurfaceContext } from "../surfaces/surface";
import { describeResult } from "../textInput/describeResult";
import type { Recording } from "./microphone";
import { createSilenceDetector } from "./silence";
import { voiceConfig } from "./voiceConfig";
import type { VoiceConfig } from "./voiceConfig";

export type VoicePhase = "idle" | "starting" | "recording" | "sending";
export type VoiceNotice = EventDescription;

export type VoiceSessionDeps = {
  context: Pick<SurfaceContext, "microphone" | "chime" | "haptic" | "recordings" | "settings">;
  config?: VoiceConfig;
  onPhase?: (phase: VoicePhase) => void;
  onNotice?: (notice: VoiceNotice) => void;
};

export type VoiceSession = {
  readonly phase: VoicePhase;
  toggle(): void;
  capture(): Promise<Blob | undefined>;
  listen(): Promise<Blob | undefined>;
  cancel(): void;
  level(): number;
  dispose(): void;
};

const POLL_MS = 50;

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));
const failure = (error: unknown): VoiceNotice => ({ text: messageOf(error), tone: "error" });

export function createVoiceSession({
  context,
  config = voiceConfig,
  onPhase = () => {},
  onNotice = () => {},
}: VoiceSessionDeps): VoiceSession {
  let phase: VoicePhase = "idle";
  let recording: Recording | undefined;
  let poll: ReturnType<typeof setInterval> | undefined;
  let disposed = false;
  let pending: { blob: Promise<Blob | undefined>; resolve(blob?: Blob): void } | undefined;

  const settle = (blob?: Blob) => {
    const done = pending;
    pending = undefined;
    done?.resolve(blob);
  };

  const enter = (next: VoicePhase) => {
    phase = next;
    onPhase(next);
  };

  const stopRecording = async (active: Recording) => {
    clearInterval(poll);
    recording = undefined;
    enter("sending");
    const blob = await active.stop();
    context.chime("stop");
    context.haptic("stop");
    return blob;
  };

  const end = async (heard: boolean) => {
    const active = recording;
    if (phase !== "recording" || !active) return;
    const blob = await stopRecording(active);
    if (pending || !heard) {
      if (!heard) onNotice({ text: strings.voice.nothingHeard, tone: "error" });
      enter("idle");
      return settle(heard ? blob : undefined);
    }
    onNotice({ text: strings.voice.thinking, tone: "neutral" });
    onNotice(await context.recordings.submit(blob).then(describeResult, failure));
    enter("idle");
  };

  const begin = async () => {
    enter("starting");
    try {
      const started = await context.microphone.start();
      if (disposed) {
        await started.stop();
        return;
      }
      recording = started;
    } catch (error) {
      enter("idle");
      onNotice(failure(error));
      return settle();
    }
    context.chime("start");
    context.haptic("start");
    enter("recording");
    onNotice({ text: strings.voice.listening, tone: "neutral" });
    const wait = { ...config, silenceTimeoutMs: context.settings.get().silenceWaitMs };
    const detector = createSilenceDetector(wait, Date.now());
    poll = setInterval(() => {
      if (!recording) return;
      const outcome = detector.update(recording.level(), Date.now());
      if (outcome !== "listening") void end(outcome === "silence");
    }, POLL_MS);
  };

  const startCapture = () => {
    if (pending || phase !== "idle" || disposed) return pending?.blob ?? Promise.resolve(undefined);
    let resolve: (blob?: Blob) => void = () => {};
    const blob = new Promise<Blob | undefined>((done) => (resolve = done));
    pending = { blob, resolve };
    void begin();
    return blob;
  };

  const cancel = () => {
    clearInterval(poll);
    void recording?.stop();
    recording = undefined;
    if (phase !== "idle") enter("idle");
    settle();
  };

  return {
    get phase() {
      return phase;
    },
    toggle() {
      if (phase === "idle" && !disposed) void begin();
      else if (phase === "recording") void end(true);
    },
    capture() {
      if (pending && phase === "recording") void end(true);
      return startCapture();
    },
    listen: startCapture,
    cancel,
    level: () => recording?.level() ?? 0,
    dispose() {
      disposed = true;
      cancel();
    },
  };
}
