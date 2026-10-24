import { strings } from "@mahmood/strings";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setupSurface } from "./setupSurface";
import { mountSetup as mounted } from "./setupHarness";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("setup surface", () => {
  it("has the id the settings use", () => {
    expect(setupSurface.id).toBe("setup");
  });

  it("is a modal dialog, the first thing a new profile sees", () => {
    const { sheet } = mounted();

    expect(sheet.hidden).toBe(false);
    expect(sheet.getAttribute("aria-modal")).toBe("true");
  });

  it("stays closed once setup has run, until it is asked to open", () => {
    const { context, sheet } = mounted({ vision: "full" });
    expect(sheet.hidden).toBe(true);

    context.setup.open();

    expect(sheet.hidden).toBe(false);
  });

  it("asks about vision in a chosen language and speaks the question with its numbered options", async () => {
    const { context, heading, options, pick, spoken, fallBack } = mounted();
    await fallBack();

    pick("Italiano");

    expect([heading().textContent, heading().lang]).toEqual(["Quanto bene vedi lo schermo?", "it"]);
    expect(
      options().map((button) => button.querySelector("[data-role=title]")?.textContent),
    ).toEqual(["Vedo bene lo schermo", "Vedo forme e colori", "Vedo a malapena lo schermo"]);
    expect(spoken.at(-1)).toBe(`it: ${strings.setup.it.visionQuestionSpoken}`);
    expect(context.profile.get().language).toBe("it");
  });

  it("reads an option again when it gets focus", async () => {
    const { options, pick, spoken, fallBack } = mounted();
    await fallBack();
    pick("Español");
    spoken.length = 0;

    options()[1]?.focus();

    expect(spoken).toEqual(["cancel", "es: Veo formas y colores"]);
  });

  it("writes language and vision, confirms aloud and closes on a choice", async () => {
    const { context, sheet, pick, spoken, fallBack } = mounted();
    await fallBack();
    pick("Italiano");
    spoken.length = 0;

    pick("Vedo a malapena lo schermo");

    expect(context.profile.get()).toMatchObject({ language: "it", vision: "minimal" });
    expect(spoken).toEqual(["cancel", "it: Fatto. Lo schermo è pronto."]);
    expect(sheet.hidden).toBe(true);
  });

  it("starts at the spoken vision question in the profile's language when reopened, and listens after it", async () => {
    const { context, heading, options, spoken, endSpeech } = mounted({ vision: "full" });
    context.profile.update({ language: "es" });

    context.setup.open();

    expect([heading().textContent, heading().lang]).toEqual([
      strings.setup.es.visionQuestion,
      "es",
    ]);
    expect(options()).toHaveLength(3);
    expect(spoken.at(-1)).toBe(`es: ${strings.setup.es.visionQuestionSpoken}`);
    expect(spoken).not.toContain(`es: ${strings.setup.es.heard}`);
    endSpeech();
    await vi.advanceTimersByTimeAsync(0);
    expect(context.mic.starts).toBe(1);
  });

  it("still greets with the welcome while setup has never run", () => {
    expect(mounted().heading().textContent).toBe("دکمه را فشار بده و بگو «سلام»");
  });

  it("closes on Escape once setup has run, but not before", () => {
    const { sheet } = mounted();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(sheet.hidden).toBe(false);

    const reopened = mounted({ vision: "low" });
    reopened.context.setup.open();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(reopened.sheet.hidden).toBe(true);
  });

  it("removes itself and stops listening when unmounted", () => {
    const { context, host, unmount } = mounted({ vision: "full" });

    unmount();
    context.setup.open();

    expect(host.children).toHaveLength(0);
  });
});
