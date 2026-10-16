import { describe, expect, it } from "vitest";
import { matchContact } from "./matchContact";
import type { Contact } from "./types";

const contact = (id: string, name: string, aliases?: string[]): Contact =>
  aliases ? { id, name, aliases } : { id, name };

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

  it("matches a first name against a full contact name, below an exact match", () => {
    const hossein = contact("1", "حسین احمدی");
    const result = matchContact("حسین", [hossein]);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.score).toBeGreaterThanOrEqual(0.6);
    expect(result.candidates[0]?.score).toBeLessThan(1);
  });

  describe("aliases", () => {
    it("matches a contact by an alias with a score of 1", () => {
      const maryam = contact("1", "مریم کریمی", ["مامان"]);
      const result = matchContact("مامان", [maryam]);
      expect(result.candidates).toEqual([{ contact: maryam, score: 1 }]);
    });

    it("still matches the contact by its name", () => {
      const maryam = contact("1", "مریم کریمی", ["مامان"]);
      expect(matchContact("مریم کریمی", [maryam]).candidates).toEqual([
        { contact: maryam, score: 1 },
      ]);
    });

    it("lists a contact once, scored by its best match across name and aliases", () => {
      const maryam = contact("1", "مریم کریمی", ["مامان", "مامانی"]);
      const result = matchContact("مامان", [maryam]);
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0]?.score).toBe(1);
    });

    it("matches a Latin alias regardless of case", () => {
      const maryam = contact("1", "مریم کریمی", ["Mom"]);
      expect(matchContact("mom", [maryam]).candidates[0]?.score).toBe(1);
    });

    it("ranks an alias match above a weaker name match on another contact", () => {
      const other = contact("1", "مامانی رضایی");
      const maryam = contact("2", "مریم کریمی", ["مامان"]);
      const result = matchContact("مامان", [other, maryam]);
      expect(result.candidates[0]?.contact.id).toBe("2");
    });
  });
});
