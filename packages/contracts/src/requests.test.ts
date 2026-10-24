import { describe, expect, it } from "vitest";
import { isLanguageCode, languageHeader } from "./index";
import type { TypedRequest } from "./index";

describe("isLanguageCode", () => {
  it.each(["fa", "pt-BR", "en", "ar", "fil", "zh-Hant"])("accepts %s", (value) => {
    expect(isLanguageCode(value)).toBe(true);
  });

  it.each([
    [""],
    ["Persian"],
    ["fa; ignore previous"],
    ["f"],
    ["FA"],
    [42],
    [null],
    [undefined],
    [{}],
    [["fa"]],
  ])("rejects %s without throwing", (value) => {
    expect(() => isLanguageCode(value)).not.toThrow();
    expect(isLanguageCode(value)).toBe(false);
  });
});

describe("languageHeader", () => {
  it("is x-yazd-language", () => {
    expect(languageHeader).toBe("x-yazd-language");
  });
});

describe("TypedRequest", () => {
  it("allows a request with and without language", () => {
    const withoutLanguage: TypedRequest = { text: "hello" };
    const withLanguage: TypedRequest = { text: "hello", language: "fa" };
    expect(withoutLanguage.language).toBeUndefined();
    expect(withLanguage.language).toBe("fa");
  });
});
