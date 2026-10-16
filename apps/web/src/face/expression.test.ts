import { describe, expect, it } from "vitest";
import { expressionFor } from "./expression";

describe("expressionFor", () => {
  it("idle is a calm neutral face", () => {
    expect(expressionFor("idle")).toMatchObject({ mouthOpen: 0, browRaise: 0, blink: 0 });
  });

  it("listening raises the brows above idle", () => {
    expect(expressionFor("listening").browRaise).toBeGreaterThan(expressionFor("idle").browRaise);
  });

  it("thinking pinches the mouth rounder than idle", () => {
    expect(expressionFor("thinking").mouthRound).toBeGreaterThan(expressionFor("idle").mouthRound);
  });

  it("speaking leaves mouth opening to the audio and smiles wider than idle", () => {
    const speaking = expressionFor("speaking");
    expect(speaking.mouthOpen).toBe(0);
    expect(speaking.mouthWidth).toBeGreaterThan(expressionFor("idle").mouthWidth);
  });
});
