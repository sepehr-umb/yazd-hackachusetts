import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { luminance } from "../flip/color";
import { createFullscreenSurface } from "./fullscreenSurface";
import { mountFullscreen as mounted } from "./fullscreenHarness";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("fullscreen surface", () => {
  it("has the id the settings use", () => {
    expect(createFullscreenSurface().id).toBe("fullscreen");
  });

  it("is one labelled screen button after the hidden Settings button, black with white ink, saying it is ready", () => {
    const { host, button, status, flip, runFrames } = mounted();
    runFrames(1);

    expect([...host.querySelectorAll("button")].map((each) => each.dataset.role)).toEqual([
      "settings",
      "flip",
    ]);
    expect(button.getAttribute("aria-label")).toBe("Tap to talk. Hold for settings.");
    expect(status.textContent).toBe("Ready");
    expect(status.lang).toBe("en");
    expect(flip()).toEqual({ color: "#000000", ink: "#FFFFFF", flash: "false" });
  });

  it("speaks the profile's language", () => {
    const { button, status } = mounted({ language: "fa" });

    expect(status.textContent).toBe("آماده");
    expect(status.dir).toBe("auto");
    expect(button.lang).toBe("fa");
  });

  it("starts listening on a tap: chime, haptic, one white flash, then yellow with black ink", async () => {
    const { context, status, flip, runFrames, tap } = mounted();
    runFrames(1);

    await tap();

    expect(context.chimes).toEqual(["start"]);
    expect(context.haptics).toEqual(["start"]);
    expect(status.textContent).toBe("Listening");
    expect(flip()).toEqual({ color: "#FFFFFF", ink: "#000000", flash: "true" });
    runFrames(8);
    expect(flip()).toEqual({ color: "#FFE600", ink: "#000000", flash: "false" });
  });

  it("stops on a second tap: chime, haptic, one flash, back to black while thinking", async () => {
    const { context, status, flip, runFrames, tap } = mounted();
    context.holdReply();
    runFrames(1);
    await tap();
    runFrames(8);

    await tap();

    expect(context.chimes).toEqual(["start", "stop"]);
    expect(context.haptics).toEqual(["start", "stop"]);
    expect(status.textContent).toBe("Thinking");
    expect(flip().flash).toBe("true");
    runFrames(8);
    expect(flip()).toEqual({ color: "#000000", ink: "#FFFFFF", flash: "false" });
  });

  it("breathes the black up toward dark grey with the reply, never toward yellow", () => {
    const { context, status, flip, runFrames } = mounted();
    runFrames(1);
    context.emit({ type: "state", state: "speaking" });
    context.setSpeechFrame({ bins: new Uint8Array(64).fill(255), hzPerBin: 100 });

    runFrames(12);

    expect(status.textContent).toBe("Done");
    expect(luminance(flip().color)).toBeGreaterThan(luminance("#101010"));
    expect(luminance(flip().color)).toBeLessThanOrEqual(luminance("#3A3A3A"));
    expect(flip().ink).toBe("#FFFFFF");
  });

  it("says try again when nothing was heard", async () => {
    const { status, tap } = mounted();
    await tap();

    await vi.advanceTimersByTimeAsync(8100);

    expect(status.textContent).toBe("Try again");
  });

  it("opens setup on a two-second hold without starting a recording", async () => {
    const { context, button } = mounted();
    const opened: number[] = [];
    context.setup.onOpen(() => opened.push(1));

    button.dispatchEvent(new PointerEvent("pointerdown", { isPrimary: true, button: 0 }));
    await vi.advanceTimersByTimeAsync(2000);
    button.dispatchEvent(new PointerEvent("pointerup", { isPrimary: true, button: 0 }));
    button.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(opened).toEqual([1]);
    expect(context.mic.starts).toBe(0);
  });

  it("flips instantly with no white frame when motion is reduced", async () => {
    const { flip, runFrames, tap } = mounted({ reduced: true });
    runFrames(1);

    await tap();

    expect(flip()).toEqual({ color: "#FFE600", ink: "#000000", flash: "false" });
  });

  it("stops drawing, listening and recording when unmounted", async () => {
    const { context, host, unmount, tap, pending } = mounted();
    await tap();

    unmount();

    expect(pending()).toBeUndefined();
    expect(context.listenerCount()).toBe(0);
    expect(context.mic.stops).toBe(1);
    expect(host.children).toHaveLength(0);
  });
});
