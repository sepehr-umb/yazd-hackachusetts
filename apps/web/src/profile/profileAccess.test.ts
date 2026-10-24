import { describe, expect, it } from "vitest";
import { defaultProfile } from "./profile";
import { createProfileStore, PROFILE_KEY } from "./profileStore";

describe("profile access fields", () => {
  it("leaves vision unset and defaults the flip to black and bright yellow", () => {
    const profile = createProfileStore(new Map()).get();

    expect(profile.vision).toBeUndefined();
    expect(profile.flipIdle).toBe("#000000");
    expect(profile.flipListening).toBe("#FFE600");
  });

  it("keeps vision, language and flip colors across a reload", () => {
    const storage = new Map<string, string>();
    createProfileStore(storage).update({
      vision: "minimal",
      language: "it",
      flipIdle: "#101010",
      flipListening: "#FFFFFF",
    });

    expect(createProfileStore(storage).get()).toMatchObject({
      vision: "minimal",
      language: "it",
      flipIdle: "#101010",
      flipListening: "#FFFFFF",
    });
  });

  it("rejects unknown vision levels, languages and colors that are not hex", () => {
    const storage = new Map([
      [
        PROFILE_KEY,
        JSON.stringify({
          vision: "blurry",
          language: "de",
          flipIdle: "red",
          flipListening: "#FFF",
        }),
      ],
    ]);

    expect(createProfileStore(storage).get()).toEqual(defaultProfile);
  });

  it.each(["full", "low", "minimal"] as const)("accepts the %s vision level", (vision) => {
    const store = createProfileStore(new Map());

    store.update({ vision });

    expect(store.get().vision).toBe(vision);
  });
});
