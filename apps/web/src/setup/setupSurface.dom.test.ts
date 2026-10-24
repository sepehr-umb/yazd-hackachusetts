import { afterEach, describe, expect, it } from "vitest";
import type { Vision } from "../profile/profile";
import { createTestContext } from "../testing/testContext";
import { setupSurface } from "./setupSurface";

afterEach(() => {
  document.body.replaceChildren();
});

function mounted(vision?: Vision) {
  const context = createTestContext();
  if (vision) context.profile.update({ vision });
  const host = document.createElement("section");
  document.body.append(host);
  const unmount = setupSurface.mount(host, context);
  const sheet = host.querySelector("[role=dialog]") as HTMLElement;
  const heading = () => sheet.querySelector("h2") as HTMLElement;
  const options = () => [
    ...sheet.querySelectorAll<HTMLButtonElement>("[data-role=options] button"),
  ];
  const pick = (text: string) =>
    options()
      .find(
        (button) =>
          (button.querySelector("[data-role=title]")?.textContent ?? button.textContent) === text,
      )
      ?.click();
  return { context, host, unmount, sheet, heading, options, pick };
}

describe("setup surface", () => {
  it("has the id the settings use", () => {
    expect(setupSurface.id).toBe("setup");
  });

  it("is the first thing a new profile sees: four languages, each named in itself", () => {
    const { sheet, heading, options } = mounted();

    expect(sheet.hidden).toBe(false);
    expect(sheet.getAttribute("aria-modal")).toBe("true");
    expect(heading().textContent).toBe("دکمه را فشار بده و بگو «سلام»");
    expect(options().map((button) => [button.textContent, button.lang, button.type])).toEqual([
      ["فارسی", "fa", "button"],
      ["English", "en", "button"],
      ["Español", "es", "button"],
      ["Italiano", "it", "button"],
    ]);
    expect(options().every((button) => button.dir === "auto")).toBe(true);
  });

  it("stays closed once setup has run, until it is asked to open", () => {
    const { context, sheet } = mounted("full");
    expect(sheet.hidden).toBe(true);

    context.setup.open();

    expect(sheet.hidden).toBe(false);
  });

  it("asks about vision in the chosen language and reads the question and the options aloud", () => {
    const { context, heading, options, pick } = mounted();

    pick("Italiano");

    expect(heading().textContent).toBe("Quanto bene vedi lo schermo?");
    expect(heading().lang).toBe("it");
    expect(
      options().map((button) => button.querySelector("[data-role=title]")?.textContent),
    ).toEqual(["Vedo bene lo schermo", "Vedo forme e colori", "Vedo a malapena lo schermo"]);
    expect(context.narration).toEqual([
      "stop",
      "it: Quanto bene vedi lo schermo?",
      "it: Vedo bene lo schermo",
      "it: Vedo forme e colori",
      "it: Vedo a malapena lo schermo",
    ]);
    expect(context.profile.get().language).toBe("fa");
  });

  it("reads an option again when it gets focus", () => {
    const { context, options, pick } = mounted();
    pick("Español");
    context.narration.length = 0;

    options()[1]?.focus();

    expect(context.narration).toEqual(["stop", "es: Veo formas y colores"]);
  });

  it("writes language and vision, confirms aloud and closes on a choice", () => {
    const { context, sheet, pick } = mounted();
    pick("Italiano");
    context.narration.length = 0;

    pick("Vedo a malapena lo schermo");

    expect(context.profile.get()).toMatchObject({ language: "it", vision: "minimal" });
    expect(context.narration).toEqual(["stop", "it: Fatto. Lo schermo è pronto."]);
    expect(sheet.hidden).toBe(true);
  });

  it("starts again from the language step when reopened", () => {
    const { context, heading, pick } = mounted("full");
    context.setup.open();
    pick("English");

    context.setup.open();

    expect(heading().textContent).toBe("دکمه را فشار بده و بگو «سلام»");
  });

  it("closes on Escape once setup has run, but not before", () => {
    const { sheet } = mounted();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(sheet.hidden).toBe(false);

    const reopened = mounted("low");
    reopened.context.setup.open();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(reopened.sheet.hidden).toBe(true);
  });

  it("removes itself and stops listening when unmounted", () => {
    const { context, host, unmount } = mounted("full");

    unmount();
    context.setup.open();

    expect(host.children).toHaveLength(0);
  });
});
