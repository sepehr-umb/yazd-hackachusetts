import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountSetup } from "./setupHarness";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("setup language hint for speech-to-text", () => {
  it("sends no hint while listening for hello, then the heard language while listening for the answer", async () => {
    const { answers, hints, tap, say, endSpeech } = mountSetup();
    answers.push({ text: "ciao", language: "it" });
    await tap();
    await tap();
    await say();

    answers.push({ text: "tre", language: "it" });
    endSpeech();
    await vi.advanceTimersByTimeAsync(0);
    await say();

    expect(hints).toEqual([undefined, "it"]);
  });

  it("sends the profile's language when setup is reopened at the vision question", async () => {
    const { context, answers, hints, say, endSpeech } = mountSetup({ vision: "full" });
    context.profile.update({ language: "es" });
    context.setup.open();

    answers.push({ text: "dos", language: "es" });
    endSpeech();
    await vi.advanceTimersByTimeAsync(0);
    await say();

    expect(hints).toEqual(["es"]);
  });
});
