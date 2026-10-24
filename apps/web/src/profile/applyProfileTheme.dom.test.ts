import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyProfile } from "./applyProfile";
import { defaultProfile } from "./profile";
import type { Vision } from "./profile";

const tokens = readFileSync(resolve("apps/web/src/styles/tokens.css"), "utf8");
const pageBackground = tokens.match(/--bg:\s*(#[0-9a-fA-F]{6})/)?.[1] ?? "";

let meta: HTMLMetaElement;

beforeEach(() => {
  const style = document.createElement("style");
  style.textContent = tokens;
  meta = document.createElement("meta");
  meta.name = "theme-color";
  meta.content = "#000000";
  document.head.append(style, meta);
});

afterEach(() => {
  document.head.replaceChildren();
  document.documentElement.removeAttribute("style");
});

const themeFor = (vision?: Vision) => {
  applyProfile(document, { ...defaultProfile, vision });
  return meta.content.toLowerCase();
};

describe("page theme color", () => {
  it("matches the page background at full vision", () => {
    expect(pageBackground).not.toBe("");
    expect(themeFor("full")).toBe(pageBackground.toLowerCase());
  });

  it.each(["low", "minimal", undefined] as const)("is black at vision %s", (vision) => {
    themeFor("full");
    expect(themeFor(vision)).toBe("#000000");
  });
});
