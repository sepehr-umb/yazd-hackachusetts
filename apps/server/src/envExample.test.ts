import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const documentedVariables = [
  "OPENROUTER_API_KEY",
  "LLM_MODEL",
  "STT_MODEL",
  "TTS_MODEL",
  "TTS_VOICE",
  "TTS_FORMAT",
  "HA_URL",
  "HA_TOKEN",
  "JELLYFIN_URL",
  "JELLYFIN_TOKEN",
  "CONTACTS_FILE",
  "GOVEE_API_KEY",
  "GOVEE_SKU",
  "GOVEE_DEVICE",
];

function readEnvExample(): Record<string, string> {
  const text = readFileSync(new URL("../../../.env.example", import.meta.url), "utf8");
  const entries = text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => line.split("=") as [string, string]);
  return Object.fromEntries(entries);
}

describe(".env.example", () => {
  it("lists exactly the variables documented in CLAUDE.md, each empty", () => {
    const variables = readEnvExample();

    expect(Object.keys(variables)).toEqual(documentedVariables);
    expect(Object.values(variables).every((value) => value === "")).toBe(true);
  });
});
