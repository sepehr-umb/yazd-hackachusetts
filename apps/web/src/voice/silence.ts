import type { VoiceConfig } from "./voiceConfig";

const BYTE_CENTER = 128;

export function levelOf(samples: ArrayLike<number>): number {
  if (samples.length === 0) return 0;
  let sumOfSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    const offset = ((samples[i] ?? BYTE_CENTER) - BYTE_CENTER) / BYTE_CENTER;
    sumOfSquares += offset * offset;
  }
  return Math.sqrt(sumOfSquares / samples.length);
}

export type SilenceConfig = VoiceConfig & { silenceTimeoutMs: number };

export type ListeningOutcome = "listening" | "silence" | "no_speech";

export type SilenceDetector = { update(level: number, nowMs: number): ListeningOutcome };

export function createSilenceDetector(
  { silenceThreshold, silenceTimeoutMs, noSpeechTimeoutMs }: SilenceConfig,
  startMs: number,
): SilenceDetector {
  let lastLoudMs: number | undefined;
  return {
    update(level, nowMs) {
      if (level > silenceThreshold) lastLoudMs = nowMs;
      if (lastLoudMs === undefined) {
        return nowMs - startMs >= noSpeechTimeoutMs ? "no_speech" : "listening";
      }
      return nowMs - lastLoudMs >= silenceTimeoutMs ? "silence" : "listening";
    },
  };
}
