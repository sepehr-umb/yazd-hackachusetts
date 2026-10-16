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
});
