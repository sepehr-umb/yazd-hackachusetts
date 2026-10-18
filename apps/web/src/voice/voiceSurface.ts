import { strings } from "@mahmood/strings";
import type { Tone } from "../activity/describeEvent";
import type { Surface } from "../surfaces/surface";
import { describeResult } from "../textInput/describeResult";
import { createSilenceDetector } from "./silence";
import { voiceConfig } from "./voiceConfig";
import type { VoiceConfig } from "./voiceConfig";
import type { Recording } from "./microphone";

export type VoiceSurfaceDeps = { config?: VoiceConfig };

type Phase = "idle" | "starting" | "recording" | "sending";

const POLL_MS = 50;
const TOGGLE_KEYS = [" ", "Enter"];
const OWN_KEY_HANDLERS = "input, textarea, select, button, a, [contenteditable]";

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

      let phase: Phase = "idle";
      let recording: Recording | undefined;
      let poll: ReturnType<typeof setInterval> | undefined;
      let mounted = true;

      const show = (message: string, tone: Tone) => {
        status.textContent = message;
        status.dataset.tone = tone;
      };

      const render = () => {
        button.setAttribute(
          "aria-label",
          phase === "recording" ? strings.voice.stop : strings.voice.start,
        );
        button.dataset.phase = phase;
        button.disabled = phase === "sending";
      };

      const send = async (blob: Blob) => {
        try {
          const { text, tone } = describeResult(await context.recordings.submit(blob));
          show(text, tone);
        } catch (error) {
          show(error instanceof Error ? error.message : String(error), "error");
        }
      };

      const finish = async () => {
        const active = recording;
        if (phase !== "recording" || !active) return;
        clearInterval(poll);
        recording = undefined;
        phase = "sending";
        render();
        show(strings.voice.thinking, "neutral");
        const blob = await active.stop();
        context.chime("stop");
        await send(blob);
        phase = "idle";
        render();
      };

      const begin = async () => {
        phase = "starting";
        try {
          const started = await context.microphone.start();
          if (!mounted) {
            await started.stop();
            return;
          }
          recording = started;
        } catch (error) {
          phase = "idle";
          show(error instanceof Error ? error.message : String(error), "error");
          return;
        }
        context.chime("start");
        phase = "recording";
        render();
        show(strings.voice.listening, "neutral");
        const detector = createSilenceDetector(config, Date.now());
        poll = setInterval(() => {
          if (recording && detector.update(recording.level(), Date.now()) === "silence")
            void finish();
        }, POLL_MS);
      };

      const toggle = () => {
        if (phase === "idle") void begin();
        else if (phase === "recording") void finish();
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (!TOGGLE_KEYS.includes(event.key)) return;
        if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
        if ((event.target as Element | null)?.closest?.(OWN_KEY_HANDLERS)) return;
        event.preventDefault();
        toggle();
      };

      button.addEventListener("click", toggle);
      document.addEventListener("keydown", onKeyDown);
      render();

      return () => {
        mounted = false;
        clearInterval(poll);
        document.removeEventListener("keydown", onKeyDown);
        void recording?.stop();
        recording = undefined;
        button.remove();
        status.remove();
      };
    },
  };
}

export const voiceSurface = createVoiceSurface();
