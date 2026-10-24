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
  const pick = (text: string) =>
    [...sheet.querySelectorAll<HTMLButtonElement>("[data-role=options] button")]
      .find(
        (button) =>
          (button.querySelector("[data-role=title]")?.textContent ?? button.textContent) === text,
      )
      ?.click();
  return { context, unmount, sheet, pick, history: context.history };
}

describe("setup sheet and the back gesture", () => {
  it("pushes one history entry when it opens, and no second one when reopened while open", () => {
    const { context, history } = mounted("full");

    context.setup.open();
    context.setup.open();

    expect(history.pushes).toBe(1);
  });

  it("closes on back once setup has run, and keeps the app", () => {
    const { context, sheet, history } = mounted("full");
    context.setup.open();

    history.pop();

    expect(sheet.hidden).toBe(true);
    expect(history.backs).toBe(0);
  });

  it("stays open on back while setup has not run, pushing its entry again", () => {
    const { sheet, history } = mounted();
    expect(history.pushes).toBe(1);

    history.pop();

    expect(sheet.hidden).toBe(false);
    expect(history.pushes).toBe(2);
  });

  it("pops its own entry when a choice closes it, and ignores the back that follows", () => {
    const { context, sheet, pick, history } = mounted("full");
    context.setup.open();
    pick("English");

    pick("I see the screen well");
    history.pop();
    context.setup.open();

    expect(history.backs).toBe(1);
    expect(history.pushes).toBe(2);
    expect(sheet.hidden).toBe(false);
  });

  it("pops its own entry when Escape closes it", () => {
    const { context, sheet, history } = mounted("low");
    context.setup.open();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    history.pop();

    expect(sheet.hidden).toBe(true);
    expect(history.backs).toBe(1);
  });

  it("ignores back while the sheet is closed", () => {
    const { sheet, history } = mounted("full");

    history.pop();

    expect(sheet.hidden).toBe(true);
    expect(history.pushes).toBe(0);
    expect(history.backs).toBe(0);
  });

  it("stops listening for back when unmounted", () => {
    const { context, unmount, history } = mounted("full");
    context.setup.open();
    unmount();

    history.pop();

    expect(history.pushes).toBe(1);
  });
});
