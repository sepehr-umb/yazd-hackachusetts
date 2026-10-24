import { afterEach, describe, expect, it } from "vitest";
import { createTestContext } from "../testing/testContext";
import { setupSurface } from "./setupSurface";

afterEach(() => {
  document.body.replaceChildren();
});

const menuOn = (button: HTMLButtonElement | undefined) => {
  const menu = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
  button?.dispatchEvent(menu);
  return menu.defaultPrevented;
};

describe("setup sheet on a long press", () => {
  it("shows no system menu on a language button or a vision button", () => {
    const host = document.createElement("section");
    document.body.append(host);
    setupSurface.mount(host, createTestContext());
    const buttons = () => [
      ...host.querySelectorAll<HTMLButtonElement>("[role=dialog] [data-role=options] button"),
    ];

    expect(menuOn(buttons()[0])).toBe(true);
    buttons()[1]?.click();
    expect(menuOn(buttons()[2])).toBe(true);
  });
});
