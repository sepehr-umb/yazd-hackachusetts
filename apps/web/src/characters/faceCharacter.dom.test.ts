import { describe, expect, it } from "vitest";
import type { FaceUniforms } from "../face/uniforms";
import { createFaceCharacter } from "./faceCharacter";
import { createCharacterEnv } from "./testEnv";

function mounted() {
  const harness = createCharacterEnv();
  const host = document.createElement("div");
  const drawn: FaceUniforms[] = [];
  const unmount = createFaceCharacter({
    createRenderer: () => ({ render: (uniforms) => drawn.push(uniforms) }),
  }).mount(host, harness.env);
  return { ...harness, host, unmount, drawn };
}

describe("face character", () => {
  it("is listed as the face with a label from strings", () => {
    const face = createFaceCharacter();
    expect(face.id).toBe("face");
    expect(face.label).toBe("Face");
  });

  it("renders the face into a canvas inside its host", () => {
    const { host, drawn, runFrames } = mounted();

    runFrames(2);

    expect(host.querySelectorAll("canvas")).toHaveLength(1);
    expect(drawn.length).toBeGreaterThan(0);
  });

  it("lip-syncs from the same speech frames the companion plays", () => {
    const { control, drawn, runFrames } = mounted();
    runFrames(1);
    const closed = drawn.at(-1)?.uMouthOpen ?? 0;

    control.state = "speaking";
    control.speech = { bins: new Uint8Array(64).fill(255), hzPerBin: 100 };
    runFrames(10);

    expect(drawn.at(-1)?.uMouthOpen).toBeGreaterThan(closed + 0.3);
  });

  it("shows the companion's state, including listening, which the stream never sends", () => {
    const { control, drawn, runFrames } = mounted();
    runFrames(1);
    const resting = drawn.at(-1)?.uBrowRaise ?? 0;

    control.state = "listening";
    runFrames(10);

    expect(drawn.at(-1)?.uBrowRaise).toBeGreaterThan(resting + 0.1);
  });

  it("falls back to the orb when WebGL is not available", () => {
    const { host } = (() => {
      const harness = createCharacterEnv();
      const host = document.createElement("div");
      createFaceCharacter({
        createRenderer: () => {
          throw new Error("WebGL2 is not available");
        },
      }).mount(host, harness.env);
      return { host };
    })();

    expect(host.querySelectorAll("canvas")).toHaveLength(0);
    expect(host.querySelector("[data-part=orb]")).not.toBeNull();
  });

  it("stops drawing and removes the canvas when unmounted", () => {
    const { host, unmount, drawn, runFrames, isScheduled } = mounted();
    runFrames(1);
    const before = drawn.length;

    unmount();
    runFrames(3);

    expect(isScheduled()).toBe(false);
    expect(drawn).toHaveLength(before);
    expect(host.children).toHaveLength(0);
  });
});
