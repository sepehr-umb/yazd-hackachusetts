import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./lowVision.css", import.meta.url), "utf8");
const app = readFileSync(new URL("./app.css", import.meta.url), "utf8");

function ruleBody(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
}

describe("low vision stylesheet", () => {
  it("is part of the app stylesheet", () => {
    expect(app).toContain('@import "./lowVision.css";');
  });

  it("sets captions one size larger than the 36 / 26 px default", () => {
    const low = ':root[data-vision="low"] [data-surface="captions"]';
    expect(ruleBody(`${low} [data-role="original"]`)).toContain("font-size: 48px");
    expect(ruleBody(`${low} [data-role="english"]`)).toContain("font-size: 36px");
  });

  it("paints the companion body with the flip color and hides the ring and spin", () => {
    expect(ruleBody('[data-flip] [data-part="core"]')).toContain("background: var(--flip-color)");
    expect(css).toMatch(
      /\[data-flip\] \[data-part="ring"\],\s*\[data-flip\] \[data-part="spin"\] \{\s*display: none;/,
    );
  });
});
