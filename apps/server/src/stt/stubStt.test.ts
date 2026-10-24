import { describe, expect, it } from "vitest";
import { createStubStt } from "./stubStt";

describe("createStubStt", () => {
  it("returns the fixture text whatever the recording holds", async () => {
    const stt = createStubStt();

    const text = await stt.transcribe({ data: Buffer.from([0]), mimeType: "audio/webm" });

    expect(text).toBe("به مامان زنگ بزن");
  });

  it("ignores the language option", async () => {
    const recording = { data: Buffer.from([0]), mimeType: "audio/webm" };

    const text = await createStubStt().transcribe(recording, { language: "en" });

    expect(text).toBe("به مامان زنگ بزن");
  });
});
