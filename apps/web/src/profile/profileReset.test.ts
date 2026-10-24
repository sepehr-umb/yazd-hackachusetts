import { describe, expect, it } from "vitest";
import { defaultProfile } from "./profile";
import { createProfileStore, PROFILE_KEY } from "./profileStore";
import type { KeyValueStorage } from "./profileStore";

describe("profile reset", () => {
  it("clears the saved profile, returns to the defaults and tells subscribers once", () => {
    const storage = new Map<string, string>();
    const store = createProfileStore(storage);
    store.update({ name: "Maman", vision: "minimal", language: "it", hue: 12 });
    const seen: Array<string | undefined> = [];
    store.subscribe((profile) => seen.push(profile.vision));

    store.reset();

    expect(store.get()).toEqual(defaultProfile);
    expect(storage.has(PROFILE_KEY)).toBe(false);
    expect(seen).toEqual([undefined]);
    expect(createProfileStore(storage).get()).toEqual(defaultProfile);
  });

  it("still resets in memory when the storage throws", () => {
    const throwing: KeyValueStorage = {
      get: () => null,
      set: () => undefined,
      delete: () => {
        throw new Error("blocked");
      },
    };
    const store = createProfileStore(throwing);
    store.update({ vision: "low" });

    store.reset();

    expect(store.get().vision).toBeUndefined();
  });
});
