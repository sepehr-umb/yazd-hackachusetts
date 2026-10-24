import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { detectLanguage } from "./detectLanguage";

describe("detectLanguage", () => {
  it("detects Farsi from Farsi-only letters", () => {
    expect(detectLanguage("به احمدی زنگ بزن")).toBe("fa");
    expect(detectLanguage("چراغ را روشن کن")).toBe("fa");
  });

  it("detects Arabic from Arabic-only letters", () => {
    expect(detectLanguage("اتصل بالبيت")).toBe("ar");
    expect(detectLanguage("شغل التلفاز يا ولدي")).toBe("ar");
  });

  it("treats Arabic script with neither letter set as Farsi", () => {
    expect(detectLanguage("مامان")).toBe("fa");
  });

  it("detects Italian from accents and cue words", () => {
    expect(detectLanguage("chiama papà")).toBe("it");
    expect(detectLanguage("manda un messaggio al mio cugino")).toBe("it");
    expect(detectLanguage("chiama mamma")).toBe("it");
  });

  it("detects plain English", () => {
    expect(detectLanguage("turn on the light")).toBe("en");
  });

  it("falls back to English for empty, digits, symbols, mixed and other scripts", () => {
    expect(detectLanguage("")).toBe("en");
    expect(detectLanguage("12345")).toBe("en");
    expect(detectLanguage("????")).toBe("en");
    expect(detectLanguage("hello سلام")).toBe("en");
    expect(detectLanguage("你好")).toBe("en");
  });

  it("always returns one of the four languages", () => {
    fc.assert(
      fc.property(fc.string({ unit: "binary" }), (text) => {
        expect(["fa", "ar", "it", "en"]).toContain(detectLanguage(text));
      }),
    );
  });
});
