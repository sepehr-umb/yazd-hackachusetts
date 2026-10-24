import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContext } from "../testing/testContext";
import { createVoiceSession } from "../voice/voiceSession";

const config = { silenceThreshold: 0.1, noSpeechTimeoutMs: 8000 };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function started() {
  const context = createTestContext();
  const session = createVoiceSession({ context, config });
  const speakThenFall = async () => {
    context.mic.level = 0.5;
    await vi.advanceTimersByTimeAsync(300);
    context.mic.level = 0;
    await vi.advanceTimersByTimeAsync(1600);
  };
  return { context, session, speakThenFall };
}

describe("voice session capture and listen", () => {
  it("captures a recording with chime and haptic, resolves the blob when speech ends, and submits nothing", async () => {
    const { context, session, speakThenFall } = started();

    const captured = session.capture();
    await vi.advanceTimersByTimeAsync(0);
    expect(session.phase).toBe("recording");
    await speakThenFall();

    expect((await captured)?.type).toBe("audio/webm");
    expect(context.chimes).toEqual(["start", "stop"]);
    expect(context.haptics).toEqual(["start", "stop"]);
    expect(context.recorded).toEqual([]);
    expect(session.phase).toBe("idle");
  });

  it("stops early when capture is called again, like a second tap", async () => {
    const { context, session } = started();
    const captured = session.capture();
    await vi.advanceTimersByTimeAsync(0);

    const again = session.capture();
    await vi.advanceTimersByTimeAsync(0);

    expect(await again).toBe(await captured);
    expect((await captured)?.type).toBe("audio/webm");
    expect(context.recorded).toEqual([]);
  });

  it("resolves nothing when no speech comes or the microphone is refused", async () => {
    const quiet = started();
    const silent = quiet.session.capture();
    await vi.advanceTimersByTimeAsync(8100);
    expect(await silent).toBeUndefined();

    const refused = started();
    refused.context.mic.refuse(new Error("denied"));
    expect(await refused.session.capture()).toBeUndefined();
  });

  it("listens without a tap, with the start chime and haptic, and never stops a recording in progress", async () => {
    const { context, session, speakThenFall } = started();

    const heard = session.listen();
    await vi.advanceTimersByTimeAsync(0);
    const second = session.listen();
    await vi.advanceTimersByTimeAsync(0);

    expect(context.chimes).toEqual(["start"]);
    expect(context.haptics).toEqual(["start"]);
    expect(session.phase).toBe("recording");
    await speakThenFall();
    expect((await heard)?.type).toBe("audio/webm");
    expect(await second).toBe(await heard);
  });

  it("cancels a capture: the microphone is released, nothing resolves and it can listen again", async () => {
    const { context, session } = started();
    const captured = session.capture();
    await vi.advanceTimersByTimeAsync(0);

    session.cancel();

    expect(await captured).toBeUndefined();
    expect(context.mic.stops).toBe(1);
    expect(session.phase).toBe("idle");
    void session.listen();
    await vi.advanceTimersByTimeAsync(0);
    expect(context.mic.starts).toBe(2);
  });
});
