import type { Character } from "./character";
import { faceCharacter } from "./faceCharacter";
import { orbCharacter } from "./orbCharacter";

export const characterRegistry: Character[] = [orbCharacter, faceCharacter];

export function characterFor(registry: Character[], id: string): Character {
  const found = registry.find((character) => character.id === id) ?? registry[0];
  if (!found) throw new Error("The character registry is empty");
  return found;
}
