import { describe, expect, it } from "vitest";
import { easeToward } from "./blend";

describe("easeToward", () => {
  it("moves part of the way to the target in one step", () => {
    const next = easeToward(0, 1, 0.1, 10);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1);
  });
});
