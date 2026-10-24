import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContext } from "../testing/testContext";
import { createVoiceSession } from "./voiceSession";

const config = { silenceThreshold: 0.1, silenceTimeoutMs: 1000, noSpeechTimeoutMs: 8000 };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function started() {
  const context = createTestContext();
  const session = createVoiceSession({ context, config });
  const toggle = async () => {
    session.toggle();
    await vi.advanceTimersByTimeAsync(0);
  };
  return { context, toggle };
}

describe("voice session haptics", () => {
  it("fires the start haptic with the start chime and the stop haptic with the stop chime", async () => {
    const { context, toggle } = started();

    await toggle();
    expect(context.haptics).toEqual(["start"]);
    await toggle();

    expect(context.haptics).toEqual(["start", "stop"]);
    expect(context.chimes).toEqual(["start", "stop"]);
  });

  it("fires the stop haptic when silence ends the recording", async () => {
    const { context, toggle } = started();
    await toggle();
    context.mic.level = 0.5;
    await vi.advanceTimersByTimeAsync(300);
    context.mic.level = 0;

    await vi.advanceTimersByTimeAsync(1100);

    expect(context.haptics).toEqual(["start", "stop"]);
  });

  it("fires the stop haptic when nothing was heard", async () => {
    const { context, toggle } = started();
    await toggle();

    await vi.advanceTimersByTimeAsync(8100);

    expect(context.haptics).toEqual(["start", "stop"]);
  });

  it("fires no haptic when the microphone is refused", async () => {
    const { context, toggle } = started();
    context.mic.refuse(new Error("denied"));

    await toggle();

    expect(context.haptics).toEqual([]);
  });
});
