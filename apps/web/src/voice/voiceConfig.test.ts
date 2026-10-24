import { describe, expect, it } from "vitest";
import * as voiceConfigModule from "./voiceConfig";

describe("voiceConfig", () => {
  it("holds the silence threshold and the no-speech timeout", () => {
    expect(voiceConfigModule.voiceConfig).toEqual({
      silenceThreshold: 0.02,
      noSpeechTimeoutMs: 8000,
    });
  });

  it("no longer carries a silence timeout", () => {
    expect(voiceConfigModule.voiceConfig).not.toHaveProperty("silenceTimeoutMs");
  });
});
