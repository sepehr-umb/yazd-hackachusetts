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
  context: Pick<SurfaceContext, "microphone" | "chime" | "haptic" | "recordings">;
  config?: VoiceConfig;
  onPhase?: (phase: VoicePhase) => void;
  onNotice?: (notice: VoiceNotice) => void;
};

export type VoiceSession = {
  readonly phase: VoicePhase;
  toggle(): void;
  level(): number;
  dispose(): void;
};

const POLL_MS = 50;

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

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

  const enter = (next: VoicePhase) => {
    phase = next;
    onPhase(next);
  };

  const send = async (blob: Blob) => {
    try {
      onNotice(describeResult(await context.recordings.submit(blob)));
    } catch (error) {
      onNotice({ text: messageOf(error), tone: "error" });
    }
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

  const finish = async () => {
    const active = recording;
    if (phase !== "recording" || !active) return;
    onNotice({ text: strings.voice.thinking, tone: "neutral" });
    await send(await stopRecording(active));
    enter("idle");
  };

  const giveUp = async () => {
    const active = recording;
    if (phase !== "recording" || !active) return;
    await stopRecording(active);
    onNotice({ text: strings.voice.nothingHeard, tone: "error" });
    enter("idle");
  };

  const listen = () => {
    const detector = createSilenceDetector(config, Date.now());
    poll = setInterval(() => {
      if (!recording) return;
      const outcome = detector.update(recording.level(), Date.now());
      if (outcome === "silence") void finish();
      else if (outcome === "no_speech") void giveUp();
    }, POLL_MS);
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
      onNotice({ text: messageOf(error), tone: "error" });
      return;
    }
    context.chime("start");
    context.haptic("start");
    enter("recording");
    onNotice({ text: strings.voice.listening, tone: "neutral" });
    listen();
  };

  return {
    get phase() {
      return phase;
    },
    toggle() {
      if (disposed) return;
      if (phase === "idle") void begin();
      else if (phase === "recording") void finish();
    },
    level: () => recording?.level() ?? 0,
    dispose() {
      disposed = true;
      clearInterval(poll);
      void recording?.stop();
      recording = undefined;
    },
  };
}
