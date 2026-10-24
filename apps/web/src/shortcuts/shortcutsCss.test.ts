import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../styles/shortcuts.css", import.meta.url), "utf8");

describe("shortcut tile stylesheet", () => {
  it("has no sublabel rules at any width", () => {
    expect(css).not.toContain("sublabel");
  });
});
