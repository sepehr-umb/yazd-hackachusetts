import { describe, expect, it } from "vitest";
import { defaultProfile } from "./profile";
import { createProfileStore, PROFILE_KEY } from "./profileStore";
import type { KeyValueStorage } from "./profileStore";

const throwing: KeyValueStorage = {
  get() {
    throw new Error("blocked");
  },
  set() {
    throw new Error("quota");
  },
};

describe("profile store", () => {
  it("starts from the defaults: yazd, the accent hue, a circle orb, Farsi", () => {
    expect(createProfileStore(new Map()).get()).toEqual({
      name: "yazd",
      hue: 30,
      shape: "circle",
      character: "orb",
      language: "fa",
      flipIdle: "#000000",
      flipListening: "#FFE600",
    });
  });

  it("saves changes and loads them back in a new store", () => {
    const storage = new Map<string, string>();
    createProfileStore(storage).update({ name: "Maman", hue: 12, shape: "blob", language: "en" });

    expect(createProfileStore(storage).get()).toEqual({
      ...defaultProfile,
      name: "Maman",
      hue: 12,
      shape: "blob",
      language: "en",
    });
  });

  it("tells subscribers about each change until they unsubscribe", () => {
    const store = createProfileStore(new Map());
    const seen: string[] = [];
    const unsubscribe = store.subscribe((profile) => seen.push(profile.character));

    store.update({ character: "face" });
    unsubscribe();
    store.update({ character: "orb" });

    expect(seen).toEqual(["face"]);
  });

  it("falls back to the defaults for stored values that are broken or out of range", () => {
    const storage = new Map([
      [
        PROFILE_KEY,
        JSON.stringify({ name: "  ", hue: 999, shape: "star", character: 4, language: "en" }),
      ],
    ]);

    expect(createProfileStore(storage).get()).toEqual({ ...defaultProfile, language: "en" });
  });

  it("ignores stored text that is not JSON", () => {
    expect(createProfileStore(new Map([[PROFILE_KEY, "{oops"]])).get()).toEqual(defaultProfile);
  });

  it("keeps working in memory when the storage throws on every call", () => {
    const store = createProfileStore(throwing);

    store.update({ hue: 40 });

    expect(store.get().hue).toBe(40);
  });

  it("rejects an invalid update field and keeps the rest", () => {
    const store = createProfileStore(new Map());

    store.update({ hue: Number.NaN, name: "Baba" });

    expect(store.get()).toMatchObject({ hue: 30, name: "Baba" });
  });
});
