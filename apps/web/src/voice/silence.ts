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

export type SilenceDetector = { update(level: number, nowMs: number): boolean };

export function createSilenceDetector({
  silenceThreshold,
  silenceTimeoutMs,
}: VoiceConfig): SilenceDetector {
  let lastLoudMs: number | undefined;
  return {
    update(level, nowMs) {
      if (level > silenceThreshold) lastLoudMs = nowMs;
      return lastLoudMs !== undefined && nowMs - lastLoudMs >= silenceTimeoutMs;
    },
  };
}
