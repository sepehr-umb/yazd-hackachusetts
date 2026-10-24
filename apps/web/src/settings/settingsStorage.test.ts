import { defaultSettings } from "@mahmood/contracts";
import type { Settings } from "@mahmood/contracts";
import { describe, expect, it } from "vitest";
import { loadSettings, saveSettings, settingsStorageKey } from "./settingsStorage";

function storageHolding(value: string | null) {
  return { getItem: (key: string) => (key === settingsStorageKey ? value : null) };
}

const saved: Settings = {
  speechRate: 0.8,
  captionSize: "extra-large",
  highContrast: false,
  silenceWaitMs: 3000,
};

describe("loadSettings", () => {
  it("uses the storage key yazd.settings", () => {
    expect(settingsStorageKey).toBe("yazd.settings");
  });

  it("returns defaults when nothing is saved", () => {
    expect(loadSettings(storageHolding(null))).toEqual(defaultSettings);
  });

  it("returns a valid saved state", () => {
    expect(loadSettings(storageHolding(JSON.stringify(saved)))).toEqual(saved);
  });

  it("falls back only for the invalid field", () => {
    const partial = JSON.stringify({ ...saved, speechRate: 9 });
    expect(loadSettings(storageHolding(partial))).toEqual({
      ...saved,
      speechRate: defaultSettings.speechRate,
    });
  });

  it("falls back for a missing field", () => {
    const withoutCaptionSize: Partial<Settings> = { ...saved };
    delete withoutCaptionSize.captionSize;
    expect(loadSettings(storageHolding(JSON.stringify(withoutCaptionSize)))).toEqual({
      ...saved,
      captionSize: defaultSettings.captionSize,
    });
  });

  it.each(["", "{not json", "[1,2]", "42", '"text"', "true", "null"])(
    "returns defaults for stored value %j",
    (stored) => {
      expect(loadSettings(storageHolding(stored))).toEqual(defaultSettings);
    },
  );

  it("returns defaults when reading throws", () => {
    const throwing = {
      getItem: () => {
        throw new Error("denied");
      },
    };
    expect(loadSettings(throwing)).toEqual(defaultSettings);
  });
});

describe("saveSettings", () => {
  it("writes the complete state as JSON under the key and returns true", () => {
    const written: Record<string, string> = {};
    const storage = {
      setItem: (key: string, value: string) => {
        written[key] = value;
      },
    };
    expect(saveSettings(storage, saved)).toBe(true);
    expect(JSON.parse(written["yazd.settings"] ?? "")).toEqual(saved);
  });

  it("returns false without throwing when writing throws", () => {
    const full = {
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(saveSettings(full, saved)).toBe(false);
  });
});
