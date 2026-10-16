import { describe, expect, it } from "vitest";
import { normalizeText } from "./normalizeText";

describe("normalizeText", () => {
  it("replaces Arabic yeh with Persian yeh", () => {
    expect(normalizeText("علي")).toBe("علی");
  });

  it("replaces Arabic kaf with Persian keheh", () => {
    expect(normalizeText("كريم")).toBe("کریم");
  });

  it.each([
    ["أ", "hamza above"],
    ["إ", "hamza below"],
    ["آ", "madda"],
  ])("replaces alef with %s (%s) with a plain alef", (variant) => {
    expect(normalizeText(`${variant}حمد`)).toBe("احمد");
  });

  it("replaces teh marbuta with heh", () => {
    expect(normalizeText("فاطمة")).toBe("فاطمه");
  });

  it("strips Arabic diacritics", () => {
    expect(normalizeText("مُحَمَّد")).toBe("محمد");
  });

  it("strips tatweel", () => {
    expect(normalizeText("محـمـد")).toBe("محمد");
  });

  it("treats a zero-width non-joiner as a space", () => {
    expect(normalizeText("علی\u200Cرضا")).toBe("علی رضا");
  });

  it("collapses runs of whitespace and trims the ends", () => {
    expect(normalizeText("  علی \t  رضا\n")).toBe("علی رضا");
  });

  it("makes a zero-width non-joiner and a space equivalent", () => {
    expect(normalizeText("علی\u200C رضا")).toBe(normalizeText("علی رضا"));
  });

  it("lowercases Latin text", () => {
    expect(normalizeText("Sara  JOHNSON")).toBe("sara johnson");
  });
});
