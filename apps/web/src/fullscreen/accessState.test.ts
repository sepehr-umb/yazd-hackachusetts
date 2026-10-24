import { describe, expect, it } from "vitest";
import { accessState } from "./accessState";

describe("accessState", () => {
  it("follows the voice while it records or sends", () => {
    expect(accessState("recording", "idle", false)).toBe("listening");
    expect(accessState("sending", "idle", false)).toBe("thinking");
    expect(accessState("starting", "speaking", false)).toBe("idle");
  });

  it("follows the stream once the voice is idle", () => {
    expect(accessState("idle", "idle", false)).toBe("idle");
    expect(accessState("idle", "thinking", false)).toBe("thinking");
    expect(accessState("idle", "speaking", false)).toBe("done");
    expect(accessState("idle", "error", false)).toBe("error");
  });

  it("says try again after a failed recording until the stream moves on", () => {
    expect(accessState("idle", "idle", true)).toBe("error");
    expect(accessState("idle", "speaking", true)).toBe("done");
  });
});
