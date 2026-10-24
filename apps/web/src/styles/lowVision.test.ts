import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./lowVision.css", import.meta.url), "utf8").replace(/\s+/g, " ");
const app = readFileSync(new URL("./app.css", import.meta.url), "utf8");

function ruleBody(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
}

describe("low vision stylesheet", () => {
  it("is part of the app stylesheet", () => {
    expect(app).toContain('@import "./lowVision.css";');
  });

  it.each([
    ["small", "30px", "22px"],
    ["medium", "36px", "28px"],
    ["large", "48px", "36px"],
    ["extra-large", "60px", "44px"],
  ])("steps captions one size above the %s setting", (size, original, english) => {
    const low = `:root[data-vision="low"] [data-surface="captions"][data-caption-size="${size}"]`;
    expect(ruleBody(`${low} [data-role="original"]`)).toContain(`font-size: ${original}`);
    expect(ruleBody(`${low} [data-role="english"]`)).toContain(`font-size: ${english}`);
  });

  it("paints the companion body with the flip color and hides the ring and spin", () => {
    expect(ruleBody('[data-flip] [data-part="core"]')).toContain("background: var(--flip-color)");
    expect(css).toMatch(
      /\[data-flip\] \[data-part="ring"\],\s*\[data-flip\] \[data-part="spin"\] \{\s*display: none;/,
    );
  });
});
