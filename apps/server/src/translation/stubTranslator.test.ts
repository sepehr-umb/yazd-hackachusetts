import { describe, expect, it } from "vitest";
import { createStubTranslator } from "./stubTranslator";

describe("createStubTranslator", () => {
  it("returns the text unchanged", async () => {
    const translator = createStubTranslator();

    expect(await translator.toEnglish("به مامان زنگ بزن")).toBe("به مامان زنگ بزن");
  });
});
