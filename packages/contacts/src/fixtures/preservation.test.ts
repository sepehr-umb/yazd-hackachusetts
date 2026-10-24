import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { matchContact } from "../matchContact";
import { fixtureContacts } from "./contacts";

const spokenForms: Array<[string, string]> = [
  ["علی رضایی", "علی رضایی"],
  ["حسین احمدی", "حسین احمدی"],
  ["حسن احمدی", "حسن احمدی"],
  ["مریم کریمی", "مریم کریمی"],
  ["فاطمه", "فاطمه"],
  ["علي كريمي", "علي كريمي"],
  ["علی کریمی", "علي كريمي"],
  ["Sara Johnson", "Sara Johnson"],
  ["David Miller", "David Miller"],
  ["بابا", "حسین احمدی"],
  ["Dad", "حسین احمدی"],
  ["مامان", "فاطمه"],
  ["Mom", "فاطمه"],
  ["آقا جون", "علي كريمي"],
  ["اقا جون", "علي كريمي"],
];

const withRandomCase = (text: string, flips: boolean[]): string =>
  [...text]
    .map((letter, index) => (flips[index % flips.length] ? letter.toUpperCase() : letter))
    .join("");

describe("existing names and aliases keep resolving to the same contact", () => {
  it.each(spokenForms)("matches %s to %s without ambiguity", (query, name) => {
    const match = matchContact(query, fixtureContacts);
    expect(match.candidates[0]?.contact.name).toBe(name);
    expect(match.ambiguous).toBe(false);
  });

  it("ignores letter case for every spoken form", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...spokenForms),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 12 }),
        ([query, name], flips) => {
          const match = matchContact(withRandomCase(query, flips), fixtureContacts);
          expect(match.candidates[0]?.contact.name).toBe(name);
          expect(match.ambiguous).toBe(false);
        },
      ),
    );
  });

  it("keeps the shared family name ambiguous between the two Ahmadi contacts only", () => {
    const match = matchContact("احمدی", fixtureContacts);
    const topTwo = match.candidates.slice(0, 2).map((candidate) => candidate.contact.name);
    expect(topTwo).toEqual(expect.arrayContaining(["حسین احمدی", "حسن احمدی"]));
    expect(match.ambiguous).toBe(true);
  });

  it("keeps every contact's own name resolving to itself", () => {
    for (const contact of fixtureContacts) {
      const match = matchContact(contact.name, fixtureContacts);
      expect(match.candidates[0]?.contact.id).toBe(contact.id);
      expect(match.candidates[0]?.score).toBe(1);
    }
  });
});
