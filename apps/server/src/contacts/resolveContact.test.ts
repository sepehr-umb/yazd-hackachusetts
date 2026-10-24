import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { fixtureContacts } from "@mahmood/contacts";
import { resolveContact } from "./resolveContact";

describe("resolveContact", () => {
  it("resolves a unique match to the stored name", () => {
    expect(resolveContact("مامان", fixtureContacts)).toEqual({ ok: true, name: "فاطمه" });
  });

  it("reports no_match with at most 3 closest names", () => {
    const resolution = resolveContact("mio cugino", fixtureContacts);
    expect(resolution.ok).toBe(false);
    if (resolution.ok) return;
    expect(resolution.reason).toBe("no_match");
    expect(resolution.closest.length).toBeLessThanOrEqual(3);
  });

  it("reports ambiguous with the matching names", () => {
    const resolution = resolveContact("احمدی", fixtureContacts);
    expect(resolution).toMatchObject({ ok: false, reason: "ambiguous" });
    if (resolution.ok) return;
    expect(resolution.closest).toContain("حسین احمدی");
    expect(resolution.closest.length).toBeLessThanOrEqual(3);
  });

  it("never returns more than 3 closest names for any query", () => {
    fc.assert(
      fc.property(fc.string(), (query) => {
        const resolution = resolveContact(query, fixtureContacts);
        return resolution.ok || resolution.closest.length <= 3;
      }),
    );
  });
});
