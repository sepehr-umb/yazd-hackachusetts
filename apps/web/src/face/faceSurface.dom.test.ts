import { describe, expect, it } from "vitest";
import { createTestContext } from "../testing/testContext";
import { createFaceSurface } from "./faceSurface";
import type { FaceUniforms } from "./uniforms";

function mounted() {
  const context = createTestContext();
  const host = document.createElement("section");
  const drawn: FaceUniforms[] = [];
  let pending: ((timestampMs: number) => void) | undefined;
  const surface = createFaceSurface({
    createRenderer: () => ({ render: (uniforms) => drawn.push(uniforms) }),
    requestFrame: (callback) => {
      pending = callback;
      return 1;
    },
    cancelFrame: () => {
      pending = undefined;
    },
  });
  const unmount = surface.mount(host, context);
  const runFrames = (count: number) => {
    for (let index = 0; index < count; index += 1) {
      const callback = pending;
      pending = undefined;
      callback?.(index * 100);
    }
  };
  return { context, host, unmount, drawn, runFrames, isScheduled: () => pending !== undefined };
}

describe("createFaceSurface", () => {
  it("has the id the settings object uses to toggle it", () => {
    expect(createFaceSurface().id).toBe("face");
  });

  it("renders the face into a canvas and lifts the brows when a listening state event arrives", () => {
    const { context, host, drawn, runFrames } = mounted();

    runFrames(1);
    const restingBrow = drawn.at(-1)?.uBrowRaise ?? 0;
    context.emit({ type: "state", state: "listening" });
    runFrames(10);

    expect(host.querySelectorAll("canvas")).toHaveLength(1);
    expect(drawn.at(-1)?.uBrowRaise).toBeGreaterThan(restingBrow + 0.1);
  });
});
