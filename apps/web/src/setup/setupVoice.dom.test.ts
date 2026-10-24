import { strings } from "@mahmood/strings";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountSetup } from "./setupHarness";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

const it_ = strings.setup.it;

function started() {
  const setup = mountSetup();
  const say = async () => {
    setup.context.mic.level = 0.5;
    await vi.advanceTimersByTimeAsync(300);
    setup.context.mic.level = 0;
    await vi.advanceTimersByTimeAsync(1600);
  };
  const greet = async (answer: { text: string; language?: "fa" | "en" | "es" | "it" }) => {
    setup.answers.push({ text: answer.text, language: answer.language });
    setup.orb().click();
    await vi.advanceTimersByTimeAsync(0);
    await say();
  };
  const answer = async (text: string) => {
    setup.answers.push({ text, language: undefined });
    setup.endSpeech();
    await vi.advanceTimersByTimeAsync(0);
    await say();
  };
  return { ...setup, say, greet, answer };
}

describe("setup by voice", () => {
  it("records a hello on a tap, switches to the language it hears and asks the vision question aloud", async () => {
    const { context, heading, options, spoken, heard, greet } = started();

    await greet({ text: "ciao", language: "it" });

    expect(context.mic.starts).toBe(1);
    expect(context.chimes).toEqual(["start", "stop"]);
    expect(heard).toHaveLength(1);
    expect(context.recorded).toEqual([]);
    expect(context.profile.get().language).toBe("it");
    expect(spoken.slice(-2)).toEqual([`it: ${it_.heard}`, `it: ${it_.visionQuestionSpoken}`]);
    expect([heading().textContent, heading().lang]).toEqual([it_.visionQuestion, "it"]);
    expect(
      options().map((button) => button.querySelector("[data-role=number]")?.textContent),
    ).toEqual(["1", "2", "3"]);
  });

  it("listens once the question has been spoken and lands on the level it hears", async () => {
    const { context, sheet, spoken, greet, answer } = started();
    await greet({ text: "ciao", language: "it" });
    expect(context.mic.starts).toBe(1);

    await answer("tre");

    expect(context.mic.starts).toBe(2);
    expect(context.profile.get()).toMatchObject({ language: "it", vision: "minimal" });
    expect(spoken.at(-1)).toBe(`it: ${it_.confirmation}`);
    expect(sheet.hidden).toBe(true);
  });

  it("asks again once after a miss, and leaves the buttons after a second miss", async () => {
    const { context, sheet, options, spoken, greet, answer } = started();
    await greet({ text: "ciao", language: "it" });

    await answer("banana");
    expect(spoken.at(-1)).toBe(`it: ${it_.sayAgain}`);
    await answer("mela");
    await vi.advanceTimersByTimeAsync(10000);

    expect(context.mic.starts).toBe(3);
    expect(context.profile.get().vision).toBeUndefined();
    expect(sheet.hidden).toBe(false);
    expect(options()).toHaveLength(3);
  });

  it("counts a failed transcription as a miss", async () => {
    const { answers, spoken, greet, endSpeech, say } = started();
    await greet({ text: "ciao", language: "it" });

    answers.push(new Error("offline"));
    endSpeech();
    await vi.advanceTimersByTimeAsync(0);
    await say();
    await vi.advanceTimersByTimeAsync(1500);

    expect(spoken.at(-1)).toBe(`it: ${it_.sayAgain}`);
  });

  it("answers at once when a button is tapped while listening, and ignores the late recording", async () => {
    const { context, sheet, pick, answers, greet, endSpeech } = started();
    await greet({ text: "ciao", language: "it" });
    endSpeech();
    await vi.advanceTimersByTimeAsync(0);
    answers.push({ text: "uno", language: undefined });

    pick("Vedo forme e colori");
    await vi.advanceTimersByTimeAsync(5000);

    expect(context.mic.stops).toBe(2);
    expect(context.profile.get().vision).toBe("low");
    expect(sheet.hidden).toBe(true);
  });
});
