import { describe, expect, it } from "vitest";
import { createStubTts } from "./stubTts";

describe("createStubTts", () => {
  it("returns the fixture audio file whatever the text", async () => {
    const tts = createStubTts();

    const audio = await tts.synthesize("سلام");

    expect(audio.mimeType).toBe("audio/wav");
    expect(audio.data.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(audio.data.subarray(8, 12).toString("ascii")).toBe("WAVE");
  });
});
