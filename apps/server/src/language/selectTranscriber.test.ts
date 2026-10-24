import { describe, expect, it } from "vitest";
import { createStubStt } from "../stt/stubStt";
import { selectTranscriber } from "./selectTranscriber";

const recording = { data: Buffer.from("voice"), mimeType: "audio/webm" };

describe("selectTranscriber", () => {
  it("uses the stub when no key is set, even though the stub STT has a fixture phrase", async () => {
    const transcriber = selectTranscriber({}, createStubStt());

    expect(await transcriber.transcribe(recording)).toEqual({ text: "", language: undefined });
  });

  it("transcribes and detects with the real STT when the key is set", async () => {
    const transcriber = selectTranscriber(
      { OPENROUTER_API_KEY: "key", LLM_MODEL: "model" },
      { transcribe: async () => "hola" },
    );

    expect(await transcriber.transcribe(recording)).toEqual({ text: "hola", language: "es" });
  });

  it("requires a model when the key is set, like the translator", () => {
    expect(() => selectTranscriber({ OPENROUTER_API_KEY: "key" }, createStubStt())).toThrow(
      "LLM_MODEL must be set",
    );
  });
});
