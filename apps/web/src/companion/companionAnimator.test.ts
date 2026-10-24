import type { AssistantState } from "@mahmood/contracts";
import { describe, expect, it } from "vitest";
import type { AudioFrame } from "../face/faceAnimator";
import { createCompanionAnimator } from "./companionAnimator";
import type { CompanionAnimator } from "./companionAnimator";

const loud: AudioFrame = { bins: new Uint8Array(64).fill(255), hzPerBin: 100 };
const STEP = 1 / 60;

function run(
  animator: CompanionAnimator,
  seconds: number,
  state: AssistantState,
  { micLevel = 0, speech = null as AudioFrame | null } = {},
) {
  let params = animator.update({ state, micLevel, speech }, 0);
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += STEP) {
    params = animator.update({ state, micLevel, speech }, STEP);
  }
  return params;
}

describe("companion animator", () => {
  it("keeps time across frames so idle breathing reaches its peak after one second", () => {
    expect(run(createCompanionAnimator(), 1, "idle").scale).toBeCloseTo(1.03, 2);
  });

  it("pulses with the speech frames and releases slowly when they stop", () => {
    const animator = createCompanionAnimator();
    const speaking = run(animator, 0.2, "speaking", { speech: loud });
    const afterSilence = run(animator, 0.1, "speaking");

    expect(speaking.scale).toBeGreaterThan(1.2);
    expect(afterSilence.scale).toBeGreaterThan(1.1);
    expect(run(animator, 2, "speaking").scale).toBeCloseTo(1, 2);
  });

  it("follows the mic level while listening", () => {
    const animator = createCompanionAnimator();

    expect(run(animator, 0.3, "listening", { micLevel: 0.2 }).scale).toBeGreaterThan(1.05);
  });

  it("tints on entering error and has settled one second later", () => {
    const animator = createCompanionAnimator();
    run(animator, 2, "idle");

    expect(run(animator, 0, "error").tint).toBeCloseTo(1);
    expect(run(animator, 1, "error").tint).toBe(0);
  });

  it("tints again when an error follows another state", () => {
    const animator = createCompanionAnimator();
    run(animator, 2, "error");
    run(animator, 0.5, "thinking");

    expect(run(animator, 0, "error").tint).toBeCloseTo(1);
  });
});
