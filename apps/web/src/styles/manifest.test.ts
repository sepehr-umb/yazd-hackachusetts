import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const publicDir = new URL("../../public/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("manifest.webmanifest", publicDir), "utf8"));
const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const tokens = readFileSync(new URL("./tokens.css", import.meta.url), "utf8").toLowerCase();

describe("web app manifest", () => {
  it("installs as yazd, standalone, in the page colors", () => {
    expect(manifest).toMatchObject({ name: "yazd", short_name: "yazd", display: "standalone" });
    expect(manifest.start_url).toBe("/");
    expect(tokens).toContain(`--bg: ${manifest.background_color.toLowerCase()}`);
    expect(tokens).toContain(`--bg: ${manifest.theme_color.toLowerCase()}`);
  });

  it("lists 192 and 512 px icons that exist in public", () => {
    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    for (const icon of manifest.icons as Array<{ src: string }>) {
      expect(existsSync(new URL(icon.src.replace(/^\//, ""), publicDir))).toBe(true);
    }
  });

  it("is linked from the page with a touch icon", () => {
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('rel="apple-touch-icon"');
  });
});
