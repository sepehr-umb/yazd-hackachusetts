import { describe, expect, it } from "vitest";
import * as contacts from "./index";

describe("@mahmood/contacts public API", () => {
  it("exports the matcher, normalizer and fixture contacts", () => {
    expect(Object.keys(contacts).sort()).toEqual([
      "DEFAULT_AMBIGUITY_MARGIN",
      "DEFAULT_THRESHOLD",
      "fixtureContacts",
      "matchContact",
      "normalizeText",
    ]);
  });
});
