import { describe, expect, it } from "vitest";
import { offersChoices } from "./offersChoices";

describe("offersChoices", () => {
  it.each([
    [{ applied: false, closest: ["حسین احمدی", "حسن احمدی"] }, true],
    [{ applied: false, closest: [] }, false],
    [{ applied: false }, false],
    [{ applied: true, closest: ["حسین احمدی"] }, false],
    [{ applied: false, closest: "حسین" }, false],
    [undefined, false],
    [null, false],
    ["applied", false],
    [42, false],
  ])("%j gives %s", (output, expected) => {
    expect(offersChoices(output)).toBe(expected);
  });
});
