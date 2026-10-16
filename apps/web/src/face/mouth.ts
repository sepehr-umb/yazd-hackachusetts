export type MouthShape = { open: number; width: number; round: number };

export function mouthFromSpectrum(bins: ArrayLike<number>, hzPerBin: number): MouthShape {
  void bins;
  void hzPerBin;
  return { open: 0, width: 1, round: 0 };
}
