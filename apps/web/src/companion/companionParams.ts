import type { AssistantState } from "@mahmood/contracts";

export type CompanionInput = {
  state: AssistantState;
  micLevel: number;
  speechLevel: number;
  time: number;
  stateTime: number;
};

export type CompanionParams = {
  scale: number;
  ring: number;
  glow: number;
  spin: number;
  tint: number;
};

const BREATH_DEPTH = 0.03;
const BREATH_HZ = 0.25;
const RING_PERIOD_S = 1.5;
const MIC_GAIN = 0.6;
const MIC_MAX_GROWTH = 0.15;
const SPIN_TURNS_PER_S = 0.1;
const SPEECH_GROWTH = 0.25;
const ERROR_SETTLE_S = 0.8;
const RESTING_GLOW = 0.35;

const still: CompanionParams = { scale: 1, ring: 0, glow: RESTING_GLOW, spin: 0, tint: 0 };

const fraction = (value: number) => value - Math.floor(value);

export function companionParams({
  state,
  micLevel,
  speechLevel,
  time,
  stateTime,
}: CompanionInput): CompanionParams {
  switch (state) {
    case "idle":
      return { ...still, scale: 1 + BREATH_DEPTH * Math.sin(2 * Math.PI * BREATH_HZ * time) };
    case "listening":
      return {
        ...still,
        scale: 1 + Math.min(MIC_MAX_GROWTH, MIC_GAIN * micLevel),
        ring: fraction(time / RING_PERIOD_S),
        glow: 0.6,
      };
    case "thinking":
      return { ...still, spin: fraction(time * SPIN_TURNS_PER_S), glow: 0.5 };
    case "speaking":
      return {
        ...still,
        scale: 1 + SPEECH_GROWTH * speechLevel,
        glow: RESTING_GLOW + (1 - RESTING_GLOW) * speechLevel,
      };
    case "error":
      return { ...still, tint: Math.max(0, 1 - stateTime / ERROR_SETTLE_S) };
  }
}
