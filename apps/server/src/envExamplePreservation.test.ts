import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const preexistingVariables = [
  "OPENROUTER_API_KEY",
  "LLM_MODEL",
  "STT_MODEL",
  "TTS_MODEL",
  "HA_URL",
  "HA_TOKEN",
  "JELLYFIN_URL",
  "JELLYFIN_TOKEN",
];

function readEntries(): Array<[string, string]> {
  const text = readFileSync(new URL("../../../.env.example", import.meta.url), "utf8");
  return text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    });
}

describe(".env.example preservation", () => {
  it("keeps the pre-existing variables in their relative order, each empty", () => {
    const entries = readEntries();
    const kept = entries.filter(([name]) => preexistingVariables.includes(name));

    expect(kept.map(([name]) => name)).toEqual(preexistingVariables);
    expect(kept.every(([, value]) => value === "")).toBe(true);
  });
});
