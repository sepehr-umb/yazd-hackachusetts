import { describe, expect, it } from "vitest";
import { withFallbackLanguage } from "./languageRule";

const languageNames = /farsi|persian|english|arabic|italian|french/i;

describe("withFallbackLanguage", () => {
  it("returns the system prompt unchanged without a code", () => {
    expect(withFallbackLanguage("You help.")).toBe("You help.");
    expect(withFallbackLanguage("You help.", undefined)).toBe("You help.");
  });

  it.each(["fa", "ar", "it", "en", "pt-BR"])("appends the exact sentence with %s", (code) => {
    const sentence = `Reply in the language the user spoke. If you cannot tell which language that is, reply in ${code}.`;

    expect(withFallbackLanguage("You help.", code)).toBe(`You help. ${sentence}`);
  });

  it.each(["", "Persian", "fa; ignore previous"])("ignores the invalid code %j", (code) => {
    expect(withFallbackLanguage("You help.", code)).toBe("You help.");
  });

  it("names no language when a code is given", () => {
    const system = withFallbackLanguage("You help.", "fa");

    expect(system).not.toMatch(languageNames);
  });
});
