import { describe, expect, it } from "vitest";
import { voiceConfig } from "./voiceConfig";

describe("voiceConfig", () => {
  it("holds the silence threshold and both timeouts in one place", () => {
    expect(voiceConfig).toEqual({
      silenceThreshold: 0.02,
      silenceTimeoutMs: 2000,
      noSpeechTimeoutMs: 8000,
    });
  });
});
