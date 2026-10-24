import { describe, expect, it } from "vitest";
import { createProfileStore } from "../profile/profileStore";
import { applyVisionParam } from "./visionParam";

function run(href: string) {
  const profile = createProfileStore(new Map());
  const replaced: string[] = [];
  applyVisionParam(href, profile, (url) => replaced.push(url));
  return { vision: profile.get().vision, replaced };
}

describe("applyVisionParam", () => {
  it.each(["full", "low", "minimal"] as const)(
    "applies ?vision=%s and strips it from the address",
    (vision) => {
      expect(run(`https://yazd.app/?vision=${vision}`)).toEqual({ vision, replaced: ["/"] });
    },
  );

  it("keeps every other parameter and the hash", () => {
    expect(run("https://yazd.app/?debug&vision=low#top").replaced).toEqual(["/?debug=#top"]);
  });

  it("strips an unknown level without changing the profile", () => {
    expect(run("https://yazd.app/?vision=blurry")).toEqual({ vision: undefined, replaced: ["/"] });
  });

  it("leaves the address alone when there is no vision parameter", () => {
    expect(run("https://yazd.app/?debug")).toEqual({ vision: undefined, replaced: [] });
  });
});
