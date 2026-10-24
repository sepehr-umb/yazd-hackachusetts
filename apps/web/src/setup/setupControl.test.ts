import { describe, expect, it } from "vitest";
import { createSetupControl } from "./setupControl";

describe("setup control", () => {
  it("tells every listener when setup is asked to open, until they stop listening", () => {
    const control = createSetupControl();
    const seen: string[] = [];
    const stop = control.onOpen(() => seen.push("a"));
    control.onOpen(() => seen.push("b"));

    control.open();
    stop();
    control.open();

    expect(seen).toEqual(["a", "b", "b"]);
  });
});
