import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContext } from "../testing/testContext";
import { createFullscreenSurface } from "./fullscreenSurface";
import { mountFullscreen } from "./fullscreenHarness";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

const frames = { requestFrame: () => 1, cancelFrame: () => {} };

describe("fullscreen surface, finding settings", () => {
  it("puts a visually hidden Settings button first, which opens setup without recording", () => {
    const { context, host } = mountFullscreen({ language: "es" });
    const opened: number[] = [];
    context.setup.onOpen(() => opened.push(1));
    const settings = host.querySelector("button") as HTMLButtonElement;

    expect(settings.dataset.role).toBe("settings");
    expect(settings.textContent).toBe("Ajustes");
    expect(settings.lang).toBe("es");
    expect(settings.tabIndex).toBe(0);
    expect(settings.style.clipPath).toBe("inset(50%)");
    settings.click();

    expect(opened).toEqual([1]);
    expect(context.mic.starts).toBe(0);
  });

  it("opens setup when a mouse holds the screen for two seconds, without recording", async () => {
    const { context, button } = mountFullscreen();
    const opened: number[] = [];
    context.setup.onOpen(() => opened.push(1));
    const mouse = (type: string) =>
      button.dispatchEvent(
        new PointerEvent(type, { bubbles: true, isPrimary: true, button: 0, pointerType: "mouse" }),
      );

    mouse("pointerdown");
    await vi.advanceTimersByTimeAsync(2000);
    mouse("pointerup");
    button.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(opened).toEqual([1]);
    expect(context.mic.starts).toBe(0);
  });

  it("speaks the hold hint in the profile's language once per page load, however often it remounts", () => {
    const surface = createFullscreenSurface(frames);
    const context = createTestContext();
    context.profile.update({ vision: "minimal", language: "it" });
    const host = document.createElement("section");

    surface.mount(host, context)();
    surface.mount(host, context)();

    expect(context.narration).toEqual([
      "it: Tieni premuto lo schermo per due secondi per cambiare le impostazioni",
    ]);
  });
});
