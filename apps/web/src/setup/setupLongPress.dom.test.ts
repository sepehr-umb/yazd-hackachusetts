import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountSetup } from "./setupHarness";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

const menuOn = (button: HTMLButtonElement | undefined) => {
  const menu = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
  button?.dispatchEvent(menu);
  return menu.defaultPrevented;
};

describe("setup sheet on a long press", () => {
  it("shows no system menu on the welcome, the orb, a language button or a vision button", async () => {
    const { orb, welcome, options, fallBack } = mountSetup();
    expect(menuOn(welcome())).toBe(true);
    expect(menuOn(orb())).toBe(true);
    await fallBack();

    expect(menuOn(options()[0])).toBe(true);
    options()[1]?.click();
    expect(menuOn(options()[2])).toBe(true);
  });
});
