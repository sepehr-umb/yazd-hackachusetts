import { describe, expect, it } from "vitest";
import { companionState } from "./companionState";

describe("companionState", () => {
  it.each(["starting", "recording"] as const)("shows listening while the voice is %s", (phase) => {
    expect(companionState(phase, "idle")).toBe("listening");
    expect(companionState(phase, "speaking")).toBe("listening");
  });

  it("shows thinking while the recording is being sent", () => {
    expect(companionState("sending", "idle")).toBe("thinking");
  });

  it.each(["idle", "listening", "thinking", "speaking", "error"] as const)(
    "shows the stream's %s state while the voice is idle",
    (state) => {
      expect(companionState("idle", state)).toBe(state);
    },
  );
});
