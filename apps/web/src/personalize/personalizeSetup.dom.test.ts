import { afterEach, describe, expect, it } from "vitest";
import { createTestContext } from "../testing/testContext";
import { createPersonalizeSurface } from "./personalizeSurface";

afterEach(() => {
  document.body.replaceChildren();
});

function mounted() {
  const context = createTestContext();
  const host = document.createElement("section");
  document.body.append(host);
  const unmount = createPersonalizeSurface().mount(host, context);
  const opener = host.querySelector("button[aria-haspopup=dialog]") as HTMLButtonElement;
  const sheet = host.querySelector("[role=dialog]") as HTMLElement;
  const group = (name: string) =>
    [...sheet.querySelectorAll("fieldset")].find(
      (fieldset) => fieldset.querySelector("legend")?.textContent === name,
    ) as HTMLFieldSetElement;
  const choices = (name: string) => [...group(name).querySelectorAll("button")];
  const pressed = (name: string) =>
    choices(name).find((button) => button.getAttribute("aria-pressed") === "true");
  const open = () => opener.click();
  return { context, host, unmount, opener, sheet, choices, pressed, open };
}

describe("personalize surface and setup", () => {
  it("closes and reopens the first-launch setup from its Vision and language button", () => {
    const { context, sheet, open } = mounted();
    const opened: number[] = [];
    context.setup.onOpen(() => opened.push(1));
    open();

    (sheet.querySelector("[data-role=setup]") as HTMLButtonElement).click();

    expect(sheet.querySelector("[data-role=setup]")?.textContent).toBe("Vision and language");
    expect(sheet.hidden).toBe(true);
    expect(opened).toEqual([1]);
  });
});
