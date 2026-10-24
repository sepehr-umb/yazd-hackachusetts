import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountCompanion } from "./companionHarness";
import { orbCharacter } from "../characters/orbCharacter";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

const flipOf = (button: HTMLElement) => ({
  color: button.style.getPropertyValue("--flip-color"),
  flash: button.dataset.flash,
});

describe("companion at low vision", () => {
  it("swaps the subtle ring for the hard flip on its own body", async () => {
    const { button, runFrames, click } = mountCompanion([orbCharacter], "low");
    runFrames(1);

    expect(button.dataset.flip).toBe("");
    expect(flipOf(button)).toEqual({ color: "#000000", flash: "false" });
    await click();
    runFrames(1);
    expect(flipOf(button)).toEqual({ color: "#FFFFFF", flash: "true" });
    runFrames(8);
    expect(flipOf(button)).toEqual({ color: "#FFE600", flash: "false" });
  });

  it("fires haptics with the chimes", async () => {
    const { context, click } = mountCompanion([orbCharacter], "low");

    await click();
    await click();

    expect(context.haptics).toEqual(["start", "stop"]);
  });

  it("opens setup on a two-second hold without recording", async () => {
    const { context, button } = mountCompanion([orbCharacter], "low");
    const opened: number[] = [];
    context.setup.onOpen(() => opened.push(1));

    button.dispatchEvent(new PointerEvent("pointerdown", { isPrimary: true, button: 0 }));
    await vi.advanceTimersByTimeAsync(2000);
    button.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(opened).toEqual([1]);
    expect(context.mic.starts).toBe(0);
  });

  it("shows a hint that holding changes settings, in the profile's language", () => {
    const { context, host } = mountCompanion([orbCharacter], "low");
    const hint = host.querySelector<HTMLElement>("[data-role=hold-hint]");

    expect(hint?.textContent).toBe("برای تغییر تنظیمات نگه دارید");
    expect(hint?.lang).toBe("fa");
    expect(hint?.dir).toBe("auto");
    context.profile.update({ language: "it" });
    expect(hint?.textContent).toBe("Tieni premuto per cambiare le impostazioni");
  });

  it("keeps the ring, no flip, no hint and no hold at full vision, but still fires haptics", async () => {
    const { context, host, button, runFrames, click } = mountCompanion([orbCharacter], "full");
    runFrames(1);
    await click();

    expect(button.dataset.flip).toBeUndefined();
    expect(button.style.getPropertyValue("--flip-color")).toBe("");
    expect(host.querySelector("[data-role=hold-hint]")).toBeNull();
    expect(context.haptics).toEqual(["start"]);
  });

  it("stops the flip when unmounted", () => {
    const { button, unmount, runFrames } = mountCompanion([orbCharacter], "low");
    runFrames(1);

    unmount();
    button.style.removeProperty("--flip-color");
    runFrames(2);

    expect(button.style.getPropertyValue("--flip-color")).toBe("");
  });
});
