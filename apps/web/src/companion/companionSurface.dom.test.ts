import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCompanionSurface } from "./companionSurface";
import { mountCompanion as mounted } from "./companionHarness";

const loud = { bins: new Uint8Array(64).fill(255), hzPerBin: 100 };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("companion surface", () => {
  it("has the id the settings object uses to toggle it", () => {
    expect(createCompanionSurface().id).toBe("companion");
  });

  it("renders one labelled button holding the character, and a status line", () => {
    const { host, button, orb, status } = mounted();

    expect(host.querySelectorAll("button")).toHaveLength(1);
    expect(button.getAttribute("aria-label")).toBe("Tap to talk to yazd");
    expect(button.contains(orb())).toBe(true);
    expect(status.dir).toBe("auto");
  });

  it("starts listening with a chime when tapped", async () => {
    const { context, button, status, orb, runFrames, click } = mounted();

    await click();
    runFrames(1);

    expect(context.mic.starts).toBe(1);
    expect(context.chimes).toEqual(["start"]);
    expect(status.textContent).toBe("Listening");
    expect(button.getAttribute("aria-label")).toBe("Tap to stop");
    expect(orb().dataset.state).toBe("listening");
  });

  it("pulses a ring and grows with the mic level while listening", async () => {
    const { context, cssVar, runFrames, click } = mounted();
    await click();
    context.mic.level = 0.2;

    runFrames(30);

    expect(cssVar("--ring")).toBeGreaterThan(0);
    expect(cssVar("--scale")).toBeGreaterThan(1.05);
  });

  it("sends when tapped again, says it is thinking, then shows the reply", async () => {
    const { context, status, orb, runFrames, click } = mounted();
    const release = context.holdReply();
    await click();

    await click();
    runFrames(1);

    expect(context.chimes).toEqual(["start", "stop"]);
    expect(status.textContent).toBe("Thinking");
    expect(orb().dataset.state).toBe("thinking");
    release({ status: "succeeded", agent: "comms", reply: "دارم زنگ می‌زنم" });
    await vi.advanceTimersByTimeAsync(0);
    expect(status.textContent).toBe("دارم زنگ می‌زنم");
  });

  it("says nothing was heard when no speech comes in time", async () => {
    const { status, click } = mounted();
    await click();

    await vi.advanceTimersByTimeAsync(8100);

    expect(status.textContent).toBe("Nothing was heard");
    expect(status.dataset.tone).toBe("error");
  });

  it("toggles with Space pressed on the page", async () => {
    const { context } = mounted();

    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    await vi.advanceTimersByTimeAsync(0);

    expect(context.mic.starts).toBe(1);
  });

  it("takes its state from the event stream while the voice is idle", () => {
    const { context, orb, cssVar, runFrames } = mounted();

    context.emit({ type: "state", state: "thinking" });
    runFrames(60);
    expect(orb().dataset.state).toBe("thinking");
    expect(cssVar("--spin")).toBeGreaterThan(0);

    context.emit({ type: "state", state: "error" });
    runFrames(1);
    expect(cssVar("--tint")).toBeGreaterThan(0.9);
  });

  it("pulses with the speech the context is playing", () => {
    const { context, cssVar, runFrames } = mounted();
    context.emit({ type: "state", state: "speaking" });
    context.setSpeechFrame(loud);

    runFrames(12);

    expect(cssVar("--scale")).toBeGreaterThan(1.2);
  });

  it("stops drawing, listening and recording when unmounted", async () => {
    const { context, host, unmount, click, pending } = mounted();
    await click();

    unmount();

    expect(pending()).toBeUndefined();
    expect(context.listenerCount()).toBe(0);
    expect(context.mic.stops).toBe(1);
    expect(host.children).toHaveLength(0);
  });
});
