import { describe, expect, it } from "vitest";
import { normalizeText } from "./normalizeText";

describe("normalizeText", () => {
  it("replaces Arabic yeh with Persian yeh", () => {
    expect(normalizeText("علي")).toBe("علی");
  });

  it("replaces Arabic kaf with Persian keheh", () => {
    expect(normalizeText("كريم")).toBe("کریم");
  });

  it("strips Arabic diacritics", () => {
    expect(normalizeText("مُحَمَّد")).toBe("محمد");
  });

  it("strips tatweel", () => {
    expect(normalizeText("محـمـد")).toBe("محمد");
  });
});
