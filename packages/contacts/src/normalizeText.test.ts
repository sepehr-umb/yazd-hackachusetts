import { describe, expect, it } from "vitest";
import { normalizeText } from "./normalizeText";

describe("normalizeText", () => {
  it("replaces Arabic yeh with Persian yeh", () => {
    expect(normalizeText("علي")).toBe("علی");
  });
});
