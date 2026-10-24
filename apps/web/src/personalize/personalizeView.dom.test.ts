import { afterEach, describe, expect, it } from "vitest";
import type { Vision } from "../profile/profile";
import { createTestContext } from "../testing/testContext";
import { createPersonalizeSurface } from "./personalizeSurface";

afterEach(() => {
  document.body.replaceChildren();
});

function mounted(vision: Vision) {
  const context = createTestContext();
  context.profile.update({ vision, language: "en" });
  const host = document.createElement("section");
  document.body.append(host);
  createPersonalizeSurface().mount(host, context);
  const sheet = host.querySelector("[role=dialog]") as HTMLElement;
  (host.querySelector("[data-role=opener]") as HTMLButtonElement).click();
  const view = () => sheet.querySelector("[data-role=view]") as HTMLElement;
  return { context, sheet, view };
}

describe("personalize sheet View row", () => {
  it.each(["full", "low"] as const)(
    "opens at %s with the View row first, the current level marked",
    (vision) => {
      const { sheet, view } = mounted(vision);

      expect(sheet.querySelector("h2")?.nextElementSibling).toBe(view());
      const pressed = view().querySelector("[aria-pressed=true]");
      expect(pressed?.textContent).toBe(vision === "full" ? "Full" : "Low");
    },
  );

  it("applies the chosen level at once and closes the sheet", () => {
    const { context, sheet, view } = mounted("full");

    [...view().querySelectorAll("button")][1]?.click();

    expect(context.profile.get().vision).toBe("low");
    expect(sheet.hidden).toBe(true);
  });
});
