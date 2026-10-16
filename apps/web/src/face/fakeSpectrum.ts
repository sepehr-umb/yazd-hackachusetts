const SYLLABLES_PER_SECOND = 3;
const VOWEL_SWEEPS_PER_SECOND = 0.4;
const VOWEL_CENTER_HZ = 1500;
const VOWEL_TRAVEL_HZ = 1300;
const VOWEL_SPREAD_HZ = 900;
const PEAK_LEVEL = 255;

export function fakeSpectrum(time: number, binCount: number, hzPerBin: number): Uint8Array {
  const envelope = Math.max(0, Math.sin(2 * Math.PI * SYLLABLES_PER_SECOND * time));
  const center =
    VOWEL_CENTER_HZ + VOWEL_TRAVEL_HZ * Math.sin(2 * Math.PI * VOWEL_SWEEPS_PER_SECOND * time);
  const bins = new Uint8Array(binCount);
  for (let i = 0; i < binCount; i++) {
    const distance = (i * hzPerBin - center) / VOWEL_SPREAD_HZ;
    bins[i] = Math.round(PEAK_LEVEL * envelope * Math.exp(-distance * distance));
  }
  return bins;
}
