import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { closestContacts } from "./closestContacts";
import { fixtureContacts } from "./fixtures/contacts";
import type { Contact } from "./types";

const names = (contacts: Contact[]): string[] => contacts.map((contact) => contact.name);

describe("closestContacts", () => {
  it("puts the best match first", () => {
    expect(names(closestContacts("Sara Johnson", fixtureContacts))[0]).toBe("Sara Johnson");
  });

  it("returns at most 3 contacts by default", () => {
    expect(closestContacts("احمدی", fixtureContacts).length).toBeLessThanOrEqual(3);
  });

  it("respects an explicit limit", () => {
    expect(closestContacts("احمدی", fixtureContacts, 1)).toHaveLength(1);
  });

  it("returns both Ahmadi contacts for the shared surname", () => {
    expect(names(closestContacts("احمدی", fixtureContacts))).toEqual(
      expect.arrayContaining(["حسین احمدی", "حسن احمدی"]),
    );
  });

  it("drops contacts with a zero score", () => {
    expect(closestContacts("zzzz", [{ id: "1", name: "علی" }])).toEqual([]);
  });

  it("returns nothing for an empty query", () => {
    expect(closestContacts("", fixtureContacts)).toEqual([]);
  });

  it("returns nothing for an empty contact list", () => {
    expect(closestContacts("mom", [])).toEqual([]);
  });

  it("never returns more than 3 contacts for any query and list", () => {
    const contact = fc.record({
      id: fc.string(),
      name: fc.string(),
      aliases: fc.option(fc.array(fc.string(), { maxLength: 3 }), { nil: undefined }),
    });

    fc.assert(
      fc.property(fc.string(), fc.array(contact, { maxLength: 10 }), (query, contacts) => {
        expect(closestContacts(query, contacts).length).toBeLessThanOrEqual(3);
      }),
    );
  });
});
