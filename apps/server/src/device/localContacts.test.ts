import { describe, expect, it } from "vitest";
import { loadLocalContacts, parseContacts } from "./localContacts";

describe("parseContacts", () => {
  it("keeps name, phone and aliases and numbers the ids", () => {
    expect(
      parseContacts([
        { name: "فاطمه", phone: "+16175550100", aliases: ["مامان"] },
        { name: "Ali", phone: "+16175550101" },
      ]),
    ).toEqual([
      { id: "1", name: "فاطمه", phone: "+16175550100", aliases: ["مامان"] },
      { id: "2", name: "Ali", phone: "+16175550101" },
    ]);
  });

  it.each([
    ["not a list", { name: "Ali" }],
    ["a missing name", [{ phone: "+1" }]],
    ["an empty name", [{ name: " ", phone: "+1" }]],
    ["a missing phone", [{ name: "Ali" }]],
    ["aliases that are not strings", [{ name: "Ali", phone: "+1", aliases: [3] }]],
  ])("rejects %s", (_label, value) => {
    expect(() => parseContacts(value)).toThrow(/contacts/i);
  });
});

describe("loadLocalContacts", () => {
  it("returns undefined when CONTACTS_FILE is not set", () => {
    expect(loadLocalContacts({}, () => "[]")).toBeUndefined();
  });

  it("reads and parses the file named by CONTACTS_FILE", () => {
    const read = (path: string) => {
      expect(path).toBe("contacts.local.json");
      return JSON.stringify([{ name: "Ali", phone: "+16175550101" }]);
    };

    expect(loadLocalContacts({ CONTACTS_FILE: "contacts.local.json" }, read)).toEqual([
      { id: "1", name: "Ali", phone: "+16175550101" },
    ]);
  });
});
