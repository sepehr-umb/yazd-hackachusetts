import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onPressOrHold } from "./longPress";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function wired(withHold = true) {
  const button = document.createElement("button");
  const log: string[] = [];
  const stop = onPressOrHold(button, {
    onPress: () => log.push("press"),
    onHold: withHold ? () => log.push("hold") : undefined,
  });
  const pointer = (type: string) =>
    button.dispatchEvent(new PointerEvent(type, { bubbles: true, isPrimary: true, button: 0 }));
  const tap = (holdMs: number) => {
    pointer("pointerdown");
    vi.advanceTimersByTime(holdMs);
    pointer("pointerup");
    button.click();
  };
  return { button, log, stop, pointer, tap };
}

describe("onPressOrHold", () => {
  it("treats a release before two seconds as a tap", () => {
    const { log, tap } = wired();

    tap(1900);

    expect(log).toEqual(["press"]);
  });

  it("fires the hold at two seconds and swallows the click that follows the release", () => {
    const { log, tap } = wired();

    tap(2000);

    expect(log).toEqual(["hold"]);
  });

  it("taps normally again after a hold", () => {
    const { log, tap } = wired();
    tap(2100);

    tap(100);

    expect(log).toEqual(["hold", "press"]);
  });

  it("presses from the keyboard or VoiceOver, which click without a pointer", () => {
    const { button, log } = wired();

    button.click();

    expect(log).toEqual(["press"]);
  });

  it("cancels the hold when the pointer is lost", () => {
    const { log, pointer } = wired();
    pointer("pointerdown");
    vi.advanceTimersByTime(500);
    pointer("pointercancel");

    vi.advanceTimersByTime(3000);

    expect(log).toEqual([]);
  });

  it("blocks the long-press system menu", () => {
    const { button } = wired();
    const menu = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });

    button.dispatchEvent(menu);

    expect(menu.defaultPrevented).toBe(true);
  });

  it("only presses when no hold is wanted, however long the finger stays", () => {
    const { log, tap } = wired(false);

    tap(3000);

    expect(log).toEqual(["press"]);
  });

  it("stops listening when removed", () => {
    const { button, log, stop } = wired();

    stop();
    button.click();

    expect(log).toEqual([]);
  });
});
