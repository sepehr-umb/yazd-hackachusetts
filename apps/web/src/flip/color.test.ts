import { describe, expect, it } from "vitest";
import { breathColor, inkFor, luminance } from "./color";

describe("flip color helpers", () => {
  it("picks white ink on dark colors and black ink on bright ones", () => {
    expect(inkFor("#000000")).toBe("#FFFFFF");
    expect(inkFor("#FFE600")).toBe("#000000");
    expect(inkFor("#FFFFFF")).toBe("#000000");
    expect(inkFor("#1A1A6E")).toBe("#FFFFFF");
  });

  it("breathes the idle color from itself at silence up to dark grey at full voice", () => {
    expect(breathColor("#000000", 0)).toBe("#000000");
    expect(breathColor("#000000", 1)).toBe("#3A3A3A");
    expect(breathColor("#000000", 5)).toBe("#3A3A3A");
    expect(breathColor("#000000", -1)).toBe("#000000");
  });

  it("never gets brighter than dark grey from black, so it stays far from yellow", () => {
    let previous = -1;
    for (let level = 0; level <= 1.0001; level += 0.05) {
      const now = luminance(breathColor("#000000", level));
      expect(now).toBeGreaterThanOrEqual(previous);
      expect(now).toBeLessThanOrEqual(luminance("#3A3A3A"));
      expect(inkFor(breathColor("#000000", level))).toBe("#FFFFFF");
      previous = now;
    }
  });
});
