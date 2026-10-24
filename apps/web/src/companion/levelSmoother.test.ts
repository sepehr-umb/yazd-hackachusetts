import { describe, expect, it } from "vitest";
import { createLevelSmoother } from "./levelSmoother";

function run(smoother: ReturnType<typeof createLevelSmoother>, target: number, seconds: number) {
  let level = 0;
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += 1 / 60) {
    level = smoother.update(target, 1 / 60);
  }
  return level;
}

describe("level smoother", () => {
  it("starts silent", () => {
    expect(createLevelSmoother().update(0, 1 / 60)).toBe(0);
  });

  it("attacks fast: most of the way to a loud level within 0.1 s", () => {
    expect(run(createLevelSmoother(), 1, 0.1)).toBeGreaterThan(0.9);
  });

  it("releases slowly: still above half 0.1 s after the sound stops", () => {
    const smoother = createLevelSmoother();
    run(smoother, 1, 0.5);

    expect(run(smoother, 0, 0.1)).toBeGreaterThan(0.5);
  });

  it("comes back to rest once the sound has been gone a while", () => {
    const smoother = createLevelSmoother();
    run(smoother, 1, 0.5);

    expect(run(smoother, 0, 2)).toBeLessThan(0.01);
  });
});
