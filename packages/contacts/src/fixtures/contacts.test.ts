import { describe, expect, it } from "vitest";
import { matchContact } from "../matchContact";
import { fixtureContacts } from "./contacts";

const topName = (query: string): string | undefined =>
  matchContact(query, fixtureContacts).candidates[0]?.contact.name;

describe("matchContact against the fixture contacts", () => {
  it("includes both Farsi and Latin names", () => {
    expect(fixtureContacts.some((contact) => /[؀-ۿ]/.test(contact.name))).toBe(true);
    expect(fixtureContacts.some((contact) => /^[A-Za-z ]+$/.test(contact.name))).toBe(true);
  });

  it("resolves an exact full name without ambiguity", () => {
    const result = matchContact("حسین احمدی", fixtureContacts);
    expect(result.candidates[0]?.contact.name).toBe("حسین احمدی");
    expect(result.ambiguous).toBe(false);
  });

  it("flags a shared family name as ambiguous", () => {
    const result = matchContact("احمدی", fixtureContacts);
    const names = result.candidates.slice(0, 2).map((candidate) => candidate.contact.name);
    expect(names).toEqual(expect.arrayContaining(["حسین احمدی", "حسن احمدی"]));
    expect(result.ambiguous).toBe(true);
  });

  it("flags a misheard name between the two similar contacts as ambiguous", () => {
    const result = matchContact("حسان احمدی", fixtureContacts);
    const names = result.candidates.slice(0, 2).map((candidate) => candidate.contact.name);
    expect(names).toEqual(expect.arrayContaining(["حسین احمدی", "حسن احمدی"]));
    expect(result.ambiguous).toBe(true);
  });

  it("matches a Persian query to a contact saved with Arabic letters", () => {
    const result = matchContact("علی کریمی", fixtureContacts);
    expect(result.candidates[0]?.contact.name).toBe("علي كريمي");
    expect(result.candidates[0]?.score).toBe(1);
  });

  it("matches a name typed with a zero-width non-joiner", () => {
    expect(topName("علی‌رضایی")).toBe("علی رضایی");
  });

  it("matches a Latin name regardless of case", () => {
    expect(topName("DAVID miller")).toBe("David Miller");
  });

  it("matches a Latin first name alone without ambiguity", () => {
    const result = matchContact("sara", fixtureContacts);
    expect(result.candidates[0]?.contact.name).toBe("Sara Johnson");
    expect(result.ambiguous).toBe(false);
  });

  it("tolerates a Latin spelling variant", () => {
    expect(topName("Sarah Johnson")).toBe("Sara Johnson");
  });

  it("returns no match for a name that is not in the list", () => {
    expect(matchContact("زهرا", fixtureContacts).candidates).toEqual([]);
  });

  it("resolves a Farsi alias to its contact without ambiguity", () => {
    const result = matchContact("مامان", fixtureContacts);
    expect(result.candidates[0]?.contact.name).toBe("فاطمه");
    expect(result.ambiguous).toBe(false);
  });

  it("resolves a Latin alias to its contact regardless of case", () => {
    const result = matchContact("MOM", fixtureContacts);
    expect(result.candidates[0]?.contact.name).toBe("فاطمه");
    expect(result.ambiguous).toBe(false);
  });

  it("resolves an alias saved with a hamza-carrying alef", () => {
    expect(topName("اقا جون")).toBe("علي كريمي");
  });

  it("resolves a Latin alias for another contact", () => {
    expect(topName("dad")).toBe("حسین احمدی");
  });
});
