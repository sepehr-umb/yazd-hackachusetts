import { describe, expect, it } from "vitest";
import { similarity } from "./similarity";

describe("similarity", () => {
  it("scores identical strings as 1", () => {
    expect(similarity("حسین", "حسین")).toBe(1);
  });
});
