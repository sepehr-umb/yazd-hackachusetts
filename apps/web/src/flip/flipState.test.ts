import { describe, expect, it } from "vitest";
import type { VoicePhase } from "../voice/voiceSession";
import { flipState, initialFlip } from "./flipState";
import type { FlipMemory, FlipState } from "./flipState";

const palette = { idle: "#000000", listening: "#FFE600" };

function run(steps: Array<[VoicePhase, number]>, reducedMotion = false) {
  let memory: FlipMemory = initialFlip;
  const states: FlipState[] = [];
  for (const [phase, nowMs] of steps) {
    const next = flipState(memory, phase, nowMs, palette, reducedMotion);
    memory = next.memory;
    states.push(next.state);
  }
  return states;
}

describe("flipState", () => {
  it("starts on the idle color with white ink and no flash", () => {
    expect(run([["idle", 0]])).toEqual([{ color: "#000000", ink: "#FFFFFF", flash: false }]);
  });

  it("stays on the idle color while the microphone is starting", () => {
    expect(
      run([
        ["idle", 0],
        ["starting", 16],
      ]).at(-1),
    ).toEqual({
      color: "#000000",
      ink: "#FFFFFF",
      flash: false,
    });
  });

  it("flashes white once for 120 ms, then shows the listening color with black ink", () => {
    const states = run([
      ["idle", 0],
      ["recording", 1000],
      ["recording", 1119],
      ["recording", 1120],
      ["recording", 5000],
    ]);

    expect(states[1]).toEqual({ color: "#FFFFFF", ink: "#000000", flash: true });
    expect(states[2]?.flash).toBe(true);
    expect(states[3]).toEqual({ color: "#FFE600", ink: "#000000", flash: false });
    expect(states[4]?.flash).toBe(false);
  });

  it("flashes once more on the way back to idle while the recording is sent", () => {
    const states = run([
      ["idle", 0],
      ["recording", 1000],
      ["sending", 3000],
      ["sending", 3200],
      ["idle", 4000],
    ]);

    expect(states.map((state) => state.flash)).toEqual([false, true, true, false, false]);
    expect(states.at(-1)?.color).toBe("#000000");
  });

  it("never flashes more than three times in any second", () => {
    const steps: Array<[VoicePhase, number]> = [["idle", 0]];
    for (let index = 1; index <= 6; index += 1) {
      steps.push([index % 2 ? "recording" : "idle", 1000 + index * 130]);
    }

    const flashes = run(steps).filter((state) => state.flash);

    expect(flashes).toHaveLength(3);
  });

  it("still changes color when a flash is held back by the limit", () => {
    const steps: Array<[VoicePhase, number]> = [["idle", 0]];
    for (let index = 1; index <= 4; index += 1) {
      steps.push([index % 2 ? "recording" : "idle", 1000 + index * 130]);
    }

    expect(run(steps).at(-1)).toEqual({ color: "#000000", ink: "#FFFFFF", flash: false });
  });

  it("allows flashes again once a second has passed", () => {
    const steps: Array<[VoicePhase, number]> = [["idle", 0]];
    for (let index = 1; index <= 3; index += 1) {
      steps.push([index % 2 ? "recording" : "idle", 1000 + index * 130]);
    }
    steps.push(["idle", 2500]);
    steps.push(["recording", 2600]);

    expect(run(steps).at(-1)?.flash).toBe(true);
  });

  it("changes color instantly with no white frame when motion is reduced", () => {
    expect(
      run(
        [
          ["idle", 0],
          ["recording", 1000],
        ],
        true,
      ).at(-1),
    ).toEqual({
      color: "#FFE600",
      ink: "#000000",
      flash: false,
    });
  });
});
