import { describe, expect, it } from "vitest";
import { characterFor, characterRegistry } from "./registry";

describe("character registry", () => {
  it("offers the orb first and the face second", () => {
    expect(characterRegistry.map((character) => character.id)).toEqual(["orb", "face"]);
  });

  it("finds a character by id and falls back to the first for an unknown one", () => {
    expect(characterFor(characterRegistry, "face").id).toBe("face");
    expect(characterFor(characterRegistry, "dragon").id).toBe("orb");
  });
});
