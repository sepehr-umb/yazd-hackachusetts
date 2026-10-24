import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContext } from "../testing/testContext";
import { createVoiceSession } from "./voiceSession";
import type { VoiceNotice, VoicePhase } from "./voiceSession";

const config = { silenceThreshold: 0.1, silenceTimeoutMs: 1000, noSpeechTimeoutMs: 8000 };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function started() {
  const context = createTestContext();
  const phases: VoicePhase[] = [];
  const notices: VoiceNotice[] = [];
  const session = createVoiceSession({
    context,
    config,
    onPhase: (phase) => phases.push(phase),
    onNotice: (notice) => notices.push(notice),
  });
  const toggle = async () => {
    session.toggle();
    await vi.advanceTimersByTimeAsync(0);
  };
  return { context, session, phases, notices, toggle };
}

describe("voice session", () => {
  it("starts idle and silent", () => {
    const { session } = started();

    expect(session.phase).toBe("idle");
    expect(session.level()).toBe(0);
  });

  it("starts recording with a chime and says it is listening", async () => {
    const { context, session, phases, notices, toggle } = started();

    await toggle();

    expect(session.phase).toBe("recording");
    expect(phases).toEqual(["starting", "recording"]);
    expect(context.chimes).toEqual(["start"]);
    expect(notices).toEqual([{ text: "Listening", tone: "neutral" }]);
  });

  it("reports the live mic level only while recording", async () => {
    const { context, session, toggle } = started();
    context.mic.level = 0.4;
    expect(session.level()).toBe(0);

    await toggle();

    expect(session.level()).toBe(0.4);
  });

  it("stops, chimes, says it is thinking, sends and reports the reply", async () => {
    const { context, session, phases, notices, toggle } = started();
    context.replyWith({ status: "succeeded", agent: "comms", reply: "دارم زنگ می‌زنم" });
    await toggle();

    await toggle();

    expect(context.chimes).toEqual(["start", "stop"]);
    expect(context.recorded).toHaveLength(1);
    expect(phases).toEqual(["starting", "recording", "sending", "idle"]);
    expect(notices.slice(1)).toEqual([
      { text: "Thinking", tone: "neutral" },
      { text: "دارم زنگ می‌زنم", tone: "neutral" },
    ]);
    expect(session.phase).toBe("idle");
  });

  it("sends by itself once the silence timeout passes after speech", async () => {
    const { context, toggle } = started();
    await toggle();
    context.mic.level = 0.5;
    await vi.advanceTimersByTimeAsync(300);
    context.mic.level = 0;

    await vi.advanceTimersByTimeAsync(1100);

    expect(context.recorded).toHaveLength(1);
  });

  it("stops without sending and says nothing was heard when no speech comes", async () => {
    const { context, session, notices, toggle } = started();
    await toggle();

    await vi.advanceTimersByTimeAsync(8100);

    expect(context.mic.stops).toBe(1);
    expect(context.recorded).toHaveLength(0);
    expect(notices.at(-1)).toEqual({ text: "Nothing was heard", tone: "error" });
    expect(session.phase).toBe("idle");
  });

  it("ignores toggles while the recording is being processed", async () => {
    const { context, session, toggle } = started();
    const release = context.holdReply();
    await toggle();
    await toggle();

    await toggle();

    expect(session.phase).toBe("sending");
    expect(context.mic.starts).toBe(1);
    release({ status: "failed", failure: { reason: "unroutable" } });
    await vi.advanceTimersByTimeAsync(0);
    expect(session.phase).toBe("idle");
  });

  it("reports the error and returns to idle when the microphone is refused", async () => {
    const { context, session, notices, toggle } = started();
    context.mic.refuse(new Error("Permission denied"));

    await toggle();

    expect(session.phase).toBe("idle");
    expect(notices).toEqual([{ text: "Permission denied", tone: "error" }]);
    expect(context.chimes).toEqual([]);
  });

  it("reports a failed send with the error tone", async () => {
    const { context, notices, toggle } = started();
    context.replyWith(new Error("Nothing was heard in the recording"));
    await toggle();

    await toggle();

    expect(notices.at(-1)).toEqual({ text: "Nothing was heard in the recording", tone: "error" });
  });

  it("releases the microphone without sending when disposed mid-recording", async () => {
    const { context, session, toggle } = started();
    await toggle();

    session.dispose();
    await vi.advanceTimersByTimeAsync(5000);

    expect(context.mic.stops).toBe(1);
    expect(context.recorded).toHaveLength(0);
  });
});
