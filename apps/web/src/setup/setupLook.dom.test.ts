import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountSetup } from "./setupHarness";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("setup sheet look", () => {
  it("gives each vision option a title and a one-line description in the chosen language", async () => {
    const { options, pick, fallBack } = mountSetup();
    await fallBack();
    expect(options()[1]?.querySelector("[data-role=detail]")).toBeNull();

    pick("English");

    expect(
      options().map((button) => [
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
