import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const publicDir = new URL("../../public/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("manifest.webmanifest", publicDir), "utf8"));
const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

type Icon = { src: string; sizes: string; type: string; purpose?: string };

const pngSize = (src: string) => {
  const bytes = readFileSync(new URL(src.replace(/^\//, ""), publicDir));
  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
};

describe("web app manifest", () => {
  it("is complete for packaging as an Android app", () => {
    expect(manifest).toMatchObject({
      name: "yazd",
      short_name: "yazd",
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#000000",
      theme_color: "#000000",
    });
  });

  it("lists 192 and 512 icons for any use and a separate 512 maskable icon", () => {
    const icons = (manifest.icons as Icon[]).filter((icon) => icon.type === "image/png");

    expect(icons.map(({ sizes, purpose }) => [sizes, purpose])).toEqual([
      ["192x192", "any"],
      ["512x512", "any"],
      ["512x512", "maskable"],
    ]);
  });

  it("points at icon files that exist, each PNG drawn at the size it claims", () => {
    for (const icon of manifest.icons as Icon[]) {
      expect(existsSync(new URL(icon.src.replace(/^\//, ""), publicDir))).toBe(true);
      if (icon.type === "image/png") expect(pngSize(icon.src)).toBe(icon.sizes);
    }
  });

  it("is linked from the page, with a touch icon and a theme color that matches it", () => {
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain(`<meta name="theme-color" content="${manifest.theme_color}"`);
  });
});
