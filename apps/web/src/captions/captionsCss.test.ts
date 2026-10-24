import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { settingSchemas } from "@mahmood/contracts";

const css = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

function ruleBody(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return "";
  return css.slice(start, css.indexOf("}", start));
}

describe("caption stylesheet", () => {
  it.each(settingSchemas.captionSize.values)("has a rule for size %s", (size) => {
    expect(css).toContain(`[data-surface="captions"][data-caption-size="${size}"]`);
  });

  it.each(["high", "normal"])("has a rule for contrast %s", (contrast) => {
    expect(css).toContain(`[data-surface="captions"][data-contrast="${contrast}"]`);
  });

  it("keeps the current look for the default size", () => {
    const body = ruleBody('[data-surface="captions"][data-caption-size="large"] [data-role="original"]');
    expect(body).toContain("font-size: 36px");
    const english = ruleBody('[data-surface="captions"][data-caption-size="large"] [data-role="english"]');
    expect(english).toContain("font-size: 28px");
  });

  it("keeps the current look for default contrast", () => {
    const body = ruleBody('[data-surface="captions"][data-contrast="high"] [data-speaker]');
    expect(body).toContain("background: #000");
    expect(body).toContain("color: #fff");
  });
});
