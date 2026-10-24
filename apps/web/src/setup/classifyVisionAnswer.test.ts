import { describe, expect, it } from "vitest";
import { classifyVisionAnswer } from "./classifyVisionAnswer";

describe("classifyVisionAnswer", () => {
  it.each([
    ["en", "one", "full"],
    ["en", "Two.", "low"],
    ["en", "number three", "minimal"],
    ["en", "3", "minimal"],
    ["es", "uno", "full"],
    ["es", "Dos", "low"],
    ["es", "tres", "minimal"],
    ["it", "uno", "full"],
    ["it", "due", "low"],
    ["it", "Tre!", "minimal"],
    ["fa", "یک", "full"],
    ["fa", "دو", "low"],
    ["fa", "سه", "minimal"],
    ["fa", "۳", "minimal"],
    ["fa", "٢", "low"],
  ] as const)("in %s hears %j as %s", (language, text, vision) => {
    expect(classifyVisionAnswer(text, language)).toBe(vision);
  });

  it.each([
    ["en", "I see the screen well", "full"],
    ["en", "shapes and colors", "low"],
    ["en", "I barely see it", "minimal"],
    ["es", "Veo bien la pantalla", "full"],
    ["es", "formas y colores", "low"],
    ["es", "Apenas veo la pantalla", "minimal"],
    ["it", "Vedo bene", "full"],
    ["it", "vedo forme e colori", "low"],
    ["it", "Vedo a malapena lo schermo", "minimal"],
    ["fa", "صفحه را خوب می‌بینم", "full"],
    ["fa", "شکل‌ها و رنگ‌ها را می‌بینم", "low"],
    ["fa", "صفحه را به‌سختی می‌بینم", "minimal"],
  ] as const)("in %s hears the option %j as %s", (language, text, vision) => {
    expect(classifyVisionAnswer(text, language)).toBe(vision);
  });

  it("lets a number win over keywords from another option", () => {
    expect(classifyVisionAnswer("three, I barely see well", "en")).toBe("minimal");
  });

  it.each([
    ["en", ""],
    ["en", "banana"],
    ["en", "one or two"],
    ["en", "tre"],
    ["it", "three"],
    ["en", "someone"],
  ] as const)("in %s hears nothing in %j", (language, text) => {
    expect(classifyVisionAnswer(text, language)).toBeUndefined();
  });
});
