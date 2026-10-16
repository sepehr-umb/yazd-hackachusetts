import { describe, expect, it } from "vitest";
import { similarity } from "./similarity";

describe("similarity", () => {
  it("scores identical strings as 1", () => {
    expect(similarity("حسین", "حسین")).toBe(1);
  });

  it("scores one edit in four characters as 0.75", () => {
    expect(similarity("حسین", "حسن")).toBe(0.75);
  });

  it("scores two empty strings as 0 rather than NaN", () => {
    expect(similarity("", "")).toBe(0);
  });

  it("scores completely different strings as 0", () => {
    expect(similarity("abc", "xyz")).toBe(0);
  });

  it("is symmetric", () => {
    expect(similarity("حسین احمدی", "حسن احمدی")).toBe(similarity("حسن احمدی", "حسین احمدی"));
  });
});
