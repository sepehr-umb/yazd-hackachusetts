import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContext } from "../testing/testContext";
import { createVoiceSession } from "./voiceSession";
import type { VoiceNotice, VoicePhase } from "./voiceSession";

const config = { silenceThreshold: 0.1, noSpeechTimeoutMs: 8000 };

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

describe("voice session silence wait", () => {
  async function speakThenFall(context: ReturnType<typeof started>["context"]) {
    context.mic.level = 0.5;
    await vi.advanceTimersByTimeAsync(300);
    context.mic.level = 0;
  }

  it("sends by itself once the silence wait from the settings passes after speech", async () => {
    const { context, toggle } = started();
    context.emit({ type: "setting_changed", name: "silenceWaitMs", value: 1000 });
    await toggle();
    await speakThenFall(context);

    await vi.advanceTimersByTimeAsync(900);
    expect(context.recorded).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(200);

    expect(context.recorded).toHaveLength(1);
  });

  it("reads the silence wait at the start of each utterance, not in the middle of one", async () => {
    const { context, toggle } = started();
    await toggle();
    context.emit({ type: "setting_changed", name: "silenceWaitMs", value: 3000 });
    await speakThenFall(context);

    await vi.advanceTimersByTimeAsync(1600);
    expect(context.recorded).toHaveLength(1);

    await toggle();
    await speakThenFall(context);
    await vi.advanceTimersByTimeAsync(2900);
    expect(context.recorded).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(200);
    expect(context.recorded).toHaveLength(2);
  });
});
