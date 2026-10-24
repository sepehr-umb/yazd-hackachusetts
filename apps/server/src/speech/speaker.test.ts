import type { AssistantEvent } from "@mahmood/contracts";
import { describe, expect, it } from "vitest";
import { createSpeaker } from "./speaker";
import { createSpeechStore } from "./speechStore";

describe("createSpeaker", () => {
  it("synthesizes exactly the given text, stores it and emits a speech event", async () => {
    const spoken: string[] = [];
    const events: AssistantEvent[] = [];
    const store = createSpeechStore();
    const speaker = createSpeaker({
      tts: {
        synthesize: async (text) => {
          spoken.push(text);
          return { data: Buffer.from("audio"), mimeType: "audio/mpeg" };
        },
      },
      store,
      bus: { emit: (event) => events.push(event) },
    });

    await speaker.speak("Mi dispiace, non ci sono riuscito.");

    expect(spoken).toEqual(["Mi dispiace, non ci sono riuscito."]);
    expect(store.size()).toBe(1);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "speech" });
    expect((events[0] as { audioUrl: string }).audioUrl).toMatch(/^\/speech\/.+/);
  });
});
