import { afterEach, describe, expect, it } from "vitest";
import { createTestContext } from "../testing/testContext";
import { shortcutsSurface } from "./shortcutsSurface";

afterEach(() => {
  document.body.replaceChildren();
});

describe("shortcuts in every profile language", () => {
  it.each([
    ["es", "Llama a mamá"],
    ["it", "Chiama la mamma"],
  ] as const)("in %s, Call Mom sends %j character for character", async (language, phrase) => {
    const context = createTestContext();
    context.profile.update({ language });
    const host = document.createElement("section");
    shortcutsSurface.mount(host, context);

    host.querySelector<HTMLButtonElement>("[data-shortcut=callMom]")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(context.submitted).toEqual([phrase]);
    expect(
      host.querySelector("[data-shortcut=callMom] [data-role=label]")?.getAttribute("lang"),
    ).toBe(language);
  });
});
