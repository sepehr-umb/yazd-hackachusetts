import type { AssistantEvent } from "@mahmood/contracts";
import { strings } from "@mahmood/strings";
import { describe, expect, it } from "vitest";
import { createCaptioner } from "./captioner";
import type { Translator } from "./translator";

function setup(translator: Translator) {
  const events: AssistantEvent[] = [];
  const captioner = createCaptioner({ translator, bus: { emit: (event) => events.push(event) } });
  return { captioner, events };
}

describe("createCaptioner", () => {
  it("emits a caption with the original text and its English translation", async () => {
    const { captioner, events } = setup({ toEnglish: async () => "Call mom" });

    await captioner.announce("user", "به مامان زنگ بزن");

    expect(events).toEqual([
      { type: "caption", speaker: "user", text: "به مامان زنگ بزن", english: "Call mom" },
    ]);
  });

  it("captions the assistant too", async () => {
    const { captioner, events } = setup({ toEnglish: async () => "Calling mom" });

    await captioner.announce("assistant", "دارم زنگ می‌زنم");

    expect(events).toEqual([
      { type: "caption", speaker: "assistant", text: "دارم زنگ می‌زنم", english: "Calling mom" },
    ]);
  });

  it("emits the translation-unavailable text and does not throw when translation fails", async () => {
    const { captioner, events } = setup({
      toEnglish: async () => {
        throw new Error("network down");
      },
    });

    await expect(captioner.announce("user", "سلام")).resolves.toBeUndefined();

    expect(events).toEqual([
      {
        type: "caption",
        speaker: "user",
        text: "سلام",
        english: strings.captions.translationUnavailable,
      },
    ]);
  });
});
