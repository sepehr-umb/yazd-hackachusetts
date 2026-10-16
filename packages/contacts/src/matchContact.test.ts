import { describe, expect, it } from "vitest";
import { matchContact } from "./matchContact";
import type { Contact } from "./types";

const contact = (id: string, name: string): Contact => ({ id, name });

describe("matchContact", () => {
  it("returns an exact name match with a score of 1", () => {
    const hossein = contact("1", "حسین احمدی");
    const result = matchContact("حسین احمدی", [hossein]);
    expect(result.candidates).toEqual([{ contact: hossein, score: 1 }]);
  });

  it("ranks candidates from highest to lowest score", () => {
    const hasan = contact("1", "حسن احمدی");
    const hossein = contact("2", "حسین احمدی");
    const result = matchContact("حسین احمدی", [hasan, hossein]);
    expect(result.candidates.map((candidate) => candidate.contact.id)).toEqual(["2", "1"]);
  });

  it("keeps input order between candidates with equal scores", () => {
    const first = contact("1", "حسین احمدی");
    const second = contact("2", "حسین احمدی");
    const result = matchContact("حسین احمدی", [first, second]);
    expect(result.candidates.map((candidate) => candidate.contact.id)).toEqual(["1", "2"]);
  });
});
