import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { matchContact } from "../matchContact";
import { fixtureContacts } from "./contacts";

const mom = "فاطمه";
const dad = "حسین احمدی";

describe("relationship aliases", () => {
  it.each([
    ["mamma", mom],
    ["mom", mom],
    ["papà", dad],
    ["papa", dad],
    ["dad", dad],
  ])("matches %s to its contact without ambiguity", (query, name) => {
    const match = matchContact(query, fixtureContacts);

    expect(match.candidates[0]?.contact.name).toBe(name);
    expect(match.ambiguous).toBe(false);
  });

  it("matches every casing of mamma and papà to the same contact", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(["mamma", mom], ["papà", dad]),
        fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }),
        ([word, name], flips) => {
          const query = [...word]
            .map((letter, index) => (flips[index] ? letter.toUpperCase() : letter))
            .join("");
          const match = matchContact(query, fixtureContacts);

          expect(match.candidates[0]?.contact.name).toBe(name);
          expect(match.ambiguous).toBe(false);
        },
      ),
    );
  });
});
