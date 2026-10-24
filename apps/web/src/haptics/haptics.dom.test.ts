import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHaptics } from "./haptics";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

function switchToggles() {
  const toggles: boolean[] = [];
  const watch = () => {
    const input = document.querySelector<HTMLInputElement>("input[switch]");
    input?.addEventListener("change", () => toggles.push(input.checked));
  };
  return { toggles, watch };
}

describe("haptics", () => {
  it("vibrates 60 ms to start and two 40 ms pulses to stop", () => {
    const patterns: number[][] = [];
    const haptic = createHaptics({
      document,
      vibrate: (pattern) => {
        patterns.push(pattern);
        return true;
      },
      supportsSwitch: true,
    });

    haptic("start");
    haptic("stop");

    expect(patterns).toEqual([[60], [40, 60, 40]]);
    expect(document.querySelector("input[switch]")).toBeNull();
  });

  it("toggles a hidden switch through its label when vibration is missing", () => {
    const haptic = createHaptics({ document, supportsSwitch: true });
    const { toggles, watch } = switchToggles();

    haptic("start");
    watch();
    haptic("stop");
    vi.advanceTimersByTime(200);

    const input = document.querySelector<HTMLInputElement>("input[switch]");
    expect(input?.type).toBe("checkbox");
    expect(input?.closest("label")?.getAttribute("aria-hidden")).toBe("true");
    expect(input?.tabIndex).toBe(-1);
    expect(toggles).toHaveLength(2);
    expect(document.querySelectorAll("input[switch]")).toHaveLength(1);
  });

  it("does nothing, quietly, when neither is available", () => {
    const haptic = createHaptics({ document, supportsSwitch: false });

    expect(() => haptic("start")).not.toThrow();
    expect(document.body.children).toHaveLength(0);
  });

  it("keeps going when vibrate throws", () => {
    const haptic = createHaptics({
      document,
      vibrate: () => {
        throw new Error("blocked");
      },
      supportsSwitch: false,
    });

    expect(() => haptic("stop")).not.toThrow();
  });
});
