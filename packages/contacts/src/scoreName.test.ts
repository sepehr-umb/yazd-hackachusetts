import { describe, expect, it } from "vitest";
import { PARTIAL_NAME_WEIGHT, scoreName } from "./scoreName";

describe("scoreName", () => {
  it("scores an identical name as 1", () => {
    expect(scoreName("حسین احمدی", "حسین احمدی")).toBe(1);
  });

  it("scores a query that is one full word of the name at the partial weight", () => {
    expect(scoreName("حسین", "حسین احمدی")).toBe(PARTIAL_NAME_WEIGHT);
  });

  it("ignores word order", () => {
    expect(scoreName("احمدی حسین", "حسین احمدی")).toBe(PARTIAL_NAME_WEIGHT);
  });

  it("scores an empty query as 0 rather than NaN", () => {
    expect(scoreName("", "حسین احمدی")).toBe(0);
  });

  it("scores an empty name as 0", () => {
    expect(scoreName("حسین", "")).toBe(0);
  });
});
