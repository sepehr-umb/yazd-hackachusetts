import { describe, expect, it } from "vitest";
import type { Stt } from "../stt/stt";
import { createStubTranscriber, createTranscriber } from "./transcriber";

const recording = { data: Buffer.from("voice"), mimeType: "audio/webm" };
const sttSaying = (text: string): Stt => ({ transcribe: async () => text });

function detectorAnswering(language?: "fa" | "en" | "es" | "it") {
  const asked: string[] = [];
  return {
    asked,
    detector: {
      async detect(text: string) {
        asked.push(text);
        return language;
      },
    },
  };
}

describe("transcriber", () => {
  it("returns the trimmed text and the language a greeting gives away, without asking the model", async () => {
    const { asked, detector } = detectorAnswering("en");

    expect(await createTranscriber(sttSaying("  Ciao!  "), detector).transcribe(recording)).toEqual(
      {
        text: "Ciao!",
        language: "it",
      },
    );
    expect(asked).toEqual([]);
  });

  it("asks the model only when the greeting table does not know the words", async () => {
    const { asked, detector } = detectorAnswering("es");

    expect(await createTranscriber(sttSaying("qué tal"), detector).transcribe(recording)).toEqual({
      text: "qué tal",
      language: "es",
    });
    expect(asked).toEqual(["qué tal"]);
  });

  it("asks nothing when nothing was heard", async () => {
    const { asked, detector } = detectorAnswering("es");

    expect(await createTranscriber(sttSaying("  "), detector).transcribe(recording)).toEqual({
      text: "",
      language: undefined,
    });
    expect(asked).toEqual([]);
  });

  it("on stubs hears nothing and knows no language, so the client falls back", async () => {
    expect(await createStubTranscriber().transcribe(recording)).toEqual({
      text: "",
      language: undefined,
    });
  });
});
