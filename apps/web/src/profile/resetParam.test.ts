import { describe, expect, it } from "vitest";
import { createProfileStore, PROFILE_KEY } from "./profileStore";
import { applyResetParam } from "./resetParam";

function run(href: string) {
  const storage = new Map<string, string>();
  const profile = createProfileStore(storage);
  profile.update({ vision: "full", language: "es" });
  const replaced: string[] = [];
  applyResetParam(href, profile, (url) => replaced.push(url));
  return { saved: storage.has(PROFILE_KEY), vision: profile.get().vision, replaced };
}

describe("applyResetParam", () => {
  it("clears the saved profile on ?reset and strips it from the address", () => {
    expect(run("https://yazd.app/?reset")).toEqual({
      saved: false,
      vision: undefined,
      replaced: ["/"],
    });
  });

  it("keeps every other parameter and the hash", () => {
    expect(run("https://yazd.app/?debug&reset#top").replaced).toEqual(["/?debug=#top"]);
  });

  it("leaves the profile and the address alone without ?reset", () => {
    expect(run("https://yazd.app/?debug")).toEqual({ saved: true, vision: "full", replaced: [] });
  });
});
