import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

const token = (name: string) => {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match?.[1]) throw new Error(`Missing token --${name}`);
  return match[1];
};

const luminance = (hex: string) => {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
};

describe("design tokens", () => {
  it.each(["ink", "ink-muted"])("keeps --%s at 7:1 or more on --bg and --surface", (name) => {
    expect(contrast(token(name), token("bg"))).toBeGreaterThanOrEqual(7);
    expect(contrast(token(name), token("surface"))).toBeGreaterThanOrEqual(7);
  });

  it("keeps --ink at 7:1 or more on --accent, where the companion and pressed tiles sit", () => {
    expect(contrast(token("ink"), token("accent"))).toBeGreaterThanOrEqual(7);
  });
});
