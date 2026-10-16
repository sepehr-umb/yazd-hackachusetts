export type MouthShape = { open: number; width: number; round: number };

const BYTE_MAX = 255;
const SPEECH_LOW_HZ = 80;
const SPEECH_HIGH_HZ = 4000;
const NOISE_FLOOR = 0.05;
const GAIN = 2.5;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function meanLevel(bins: ArrayLike<number>, hzPerBin: number, fromHz: number, toHz: number) {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < bins.length; i++) {
    const hz = i * hzPerBin;
    if (hz < fromHz || hz >= toHz) continue;
    sum += (bins[i] ?? 0) / BYTE_MAX;
    count++;
  }
  return count === 0 ? 0 : sum / count;
}

export function mouthFromSpectrum(bins: ArrayLike<number>, hzPerBin: number): MouthShape {
  const level = meanLevel(bins, hzPerBin, SPEECH_LOW_HZ, SPEECH_HIGH_HZ);
  return { open: clamp01((level - NOISE_FLOOR) * GAIN), width: 1, round: 0 };
}
