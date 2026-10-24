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

describe("personalize surface", () => {
  it("has the id the settings object uses to toggle it", () => {
    expect(createPersonalizeSurface().id).toBe("personalize");
  });

  it("shows only a labelled round button until it is opened", () => {
    const { opener, sheet } = mounted();

    expect(opener.getAttribute("aria-label")).toBe("Personalize");
    expect(opener.getAttribute("aria-expanded")).toBe("false");
    expect(sheet.hidden).toBe(true);
  });

  it("opens a labelled sheet and moves focus into it", () => {
    const { opener, sheet, open } = mounted();

    open();

    expect(opener.getAttribute("aria-expanded")).toBe("true");
    expect(sheet.hidden).toBe(false);
    expect(sheet.getAttribute("aria-label")).toBe("Make it yours");
    expect(sheet.contains(document.activeElement)).toBe(true);
  });

  it("renames the companion live from the name field", () => {
    const { context, sheet, open } = mounted();
    open();
    const field = sheet.querySelector("input") as HTMLInputElement;

    field.value = "ماهی";
    field.dispatchEvent(new Event("input"));

    expect(field.dir).toBe("auto");
    expect(sheet.querySelector(`label[for="${field.id}"]`)?.textContent).toBe("Name");
    expect(context.profile.get().name).toBe("ماهی");
  });

  it("offers six named warm hues and applies the chosen one at once", () => {
    const { context, choices, pressed, open } = mounted();
    open();

    expect(choices("Color")).toHaveLength(6);
    expect(pressed("Color")?.getAttribute("aria-label")).toBe("Apricot");
    choices("Color")[1]?.click();

    expect(context.profile.get().hue).not.toBe(30);
    expect(pressed("Color")).toBe(choices("Color")[1]);
  });

  it("offers the shape presets, the characters and the languages in the shortcut data", () => {
    const { context, choices, open } = mounted();
    open();

    expect(choices("Shape").map((button) => button.textContent)).toEqual([
      "Circle",
      "Blob",
      "Ring",
    ]);
    expect(choices("Character").map((button) => button.textContent)).toEqual([
      "Glowing orb",
      "Face",
    ]);
    expect(choices("Language").map((button) => button.lang)).toEqual(["fa", "en", "es", "it"]);
    expect(choices("Language").map((button) => button.textContent)).toEqual([
      "فارسی",
      "English",
      "Español",
      "Italiano",
    ]);

    choices("Shape")[1]?.click();
    choices("Character")[1]?.click();
    choices("Language")[1]?.click();

    expect(context.profile.get()).toMatchObject({
      shape: "blob",
      character: "face",
      language: "en",
    });
  });

  it("closes on Escape and gives focus back to the round button", () => {
    const { opener, sheet, open } = mounted();
    open();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(sheet.hidden).toBe(true);
    expect(document.activeElement).toBe(opener);
  });

  it("closes when tapping outside the sheet but not inside it", () => {
    const { host, sheet, open } = mounted();
    open();

    sheet.querySelector("fieldset")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(sheet.hidden).toBe(false);

    host
      .querySelector("[data-role=backdrop]")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(sheet.hidden).toBe(true);
  });

  it("closes with its Done button", () => {
    const { sheet, open } = mounted();
    open();

    (sheet.querySelector("[data-role=done]") as HTMLButtonElement).click();

    expect(sheet.hidden).toBe(true);
  });

  it("removes itself and stops listening for keys when unmounted", () => {
    const { host, unmount } = mounted();

    unmount();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(host.children).toHaveLength(0);
  });
});
