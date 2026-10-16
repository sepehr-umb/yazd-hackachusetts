import { describe, expect, it } from "vitest";
import { similarity } from "./similarity";

describe("similarity", () => {
  it("scores identical strings as 1", () => {
    expect(similarity("حسین", "حسین")).toBe(1);
  });

  it("scores one edit in four characters as 0.75", () => {
    expect(similarity("حسین", "حسن")).toBe(0.75);
  });
});
