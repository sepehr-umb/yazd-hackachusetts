const WHITE = "#FFFFFF";
const BLACK = "#000000";
const BREATH_LIMIT = "#3A3A3A";
const INK_SWITCH_LUMINANCE = 0.179;

const channels = (hex: string) =>
  [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)) as [number, number, number];

const toHex = (values: number[]) =>
  `#${values.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`.toUpperCase();

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function inkFor(background: string): string {
  return luminance(background) > INK_SWITCH_LUMINANCE ? BLACK : WHITE;
}

export function breathColor(idle: string, level: number): string {
  const amount = clamp01(level);
  const from = channels(idle);
  const to = channels(BREATH_LIMIT);
  return toHex(from.map((value, index) => value + ((to[index] ?? value) - value) * amount));
}
