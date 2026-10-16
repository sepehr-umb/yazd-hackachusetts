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

  it("returns no candidates when nothing is similar enough", () => {
    const result = matchContact("مریم کریمی", [contact("1", "حسین احمدی")]);
    expect(result.candidates).toEqual([]);
  });

  it("accepts a stricter threshold", () => {
    const hasan = contact("1", "حسن احمدی");
    const hossein = contact("2", "حسین احمدی");
    const result = matchContact("حسین احمدی", [hasan, hossein], { threshold: 0.95 });
    expect(result.candidates.map((candidate) => candidate.contact.id)).toEqual(["2"]);
  });

  it("flags the result as ambiguous when the top two scores are equal", () => {
    const first = contact("1", "حسین احمدی");
    const second = contact("2", "حسین احمدی");
    expect(matchContact("حسین احمدی", [first, second]).ambiguous).toBe(true);
  });

  it("does not flag an exact match that clearly beats a similar name", () => {
    const hasan = contact("1", "حسن احمدی");
    const hossein = contact("2", "حسین احمدی");
    expect(matchContact("حسین احمدی", [hasan, hossein]).ambiguous).toBe(false);
  });

  it("accepts a wider ambiguity margin", () => {
    const hasan = contact("1", "حسن احمدی");
    const hossein = contact("2", "حسین احمدی");
    const result = matchContact("حسین احمدی", [hasan, hossein], { ambiguityMargin: 0.2 });
    expect(result.ambiguous).toBe(true);
  });

  it("does not flag a single candidate", () => {
    expect(matchContact("حسین احمدی", [contact("1", "حسین احمدی")]).ambiguous).toBe(false);
  });

  it("does not flag an empty result", () => {
    expect(matchContact("حسین احمدی", []).ambiguous).toBe(false);
  });
});
