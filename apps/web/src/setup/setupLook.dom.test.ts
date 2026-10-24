import { afterEach, describe, expect, it } from "vitest";
import { createTestContext } from "../testing/testContext";
import { setupSurface } from "./setupSurface";

afterEach(() => {
  document.body.replaceChildren();
});

function mounted() {
  const host = document.createElement("section");
  document.body.append(host);
  setupSurface.mount(host, createTestContext());
  const sheet = host.querySelector("[role=dialog]") as HTMLElement;
  const buttons = () => [
    ...sheet.querySelectorAll<HTMLButtonElement>("[data-role=options] button"),
  ];
  return { sheet, buttons };
}

describe("setup sheet look", () => {
  it("gives each vision option a title and a one-line description in the chosen language", () => {
    const { buttons } = mounted();
    expect(buttons()[1]?.querySelector("[data-role=detail]")).toBeNull();

    buttons()[1]?.click();

    expect(
      buttons().map((button) => [
        button.querySelector("[data-role=title]")?.textContent,
        button.querySelector("[data-role=detail]")?.textContent,
      ]),
    ).toEqual([
      ["I see the screen well", "Buttons, captions and text"],
      ["I see shapes and colors", "Larger text, strong colors"],
      ["I barely see the screen", "One big button, voice only"],
    ]);
  });
});
