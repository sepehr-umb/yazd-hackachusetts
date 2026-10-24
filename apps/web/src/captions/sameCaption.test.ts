import { describe, expect, it } from "vitest";
import { sameCaption } from "./sameCaption";

describe("sameCaption", () => {
  it("treats identical text as the same", () => {
    expect(sameCaption("Call Mom", "Call Mom")).toBe(true);
  });

  it("ignores case and extra whitespace", () => {
    expect(sameCaption("  Call   mom ", "call Mom")).toBe(true);
  });

  it("keeps a translation that differs", () => {
    expect(sameCaption("به مامان زنگ بزن", "Call Mom")).toBe(false);
  });

  it("does not hide an empty translation behind empty text", () => {
    expect(sameCaption("", "")).toBe(true);
    expect(sameCaption("Call Mom", "")).toBe(false);
  });
});
