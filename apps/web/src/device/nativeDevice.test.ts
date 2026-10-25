import { describe, expect, it } from "vitest";
import { nativeDevice } from "./nativeDevice";

describe("nativeDevice", () => {
  it("is absent outside the Android app", () => {
    expect(nativeDevice()).toBeUndefined();
  });
});
