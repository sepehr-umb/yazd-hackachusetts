import { easeToward } from "../face/blend";

export type LevelSmootherConfig = { attackRate?: number; releaseRate?: number };
export type LevelSmoother = { update(target: number, dt: number): number };

export function createLevelSmoother({
  attackRate = 40,
  releaseRate = 4,
}: LevelSmootherConfig = {}): LevelSmoother {
  let level = 0;
  return {
    update(target, dt) {
      level = easeToward(level, target, dt, target > level ? attackRate : releaseRate);
      return level;
    },
  };
}
