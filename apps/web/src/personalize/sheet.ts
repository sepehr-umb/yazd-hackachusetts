import { strings } from "@mahmood/strings";
import type { Character } from "../characters/character";
import type { Language } from "../profile/languages";
import { shapes } from "../profile/profile";
import type { Profile } from "../profile/profile";
import type { ProfileStore } from "../profile/profileStore";
import { choiceGroup } from "./choiceGroup";
import { warmHues } from "./hues";

export type SheetDeps = {
  profile: ProfileStore;
  characters: Character[];
  languages: readonly Language[];
};

const NAME_FIELD_ID = "personalize-name";

function nameField(document: Document, profile: ProfileStore) {
  const wrapper = document.createElement("div");
  wrapper.dataset.role = "field";
  const label = document.createElement("label");
  label.htmlFor = NAME_FIELD_ID;
  label.textContent = strings.personalize.name;
  const input = document.createElement("input");
  input.id = NAME_FIELD_ID;
  input.type = "text";
  input.dir = "auto";
  input.autocomplete = "off";
  input.addEventListener("input", () => profile.update({ name: input.value }));
  wrapper.append(label, input);
  return { element: wrapper, input };
}

export function createSheet(document: Document, { profile, characters, languages }: SheetDeps) {
  const sheet = document.createElement("div");
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", strings.personalize.title);
  sheet.hidden = true;
  const heading = document.createElement("h2");
  heading.textContent = strings.personalize.title;
  const name = nameField(document, profile);
  const pick = (patch: Partial<Profile>) => profile.update(patch);
  const hue = choiceGroup(
    document,
    strings.personalize.color,
    warmHues.map(({ id, hue }) => ({
      value: hue as number,
      label: strings.personalize.hues[id],
      hue,
    })),
    (value) => pick({ hue: value }),
  );
  const shape = choiceGroup(
    document,
    strings.personalize.shape,
    shapes.map((value) => ({ value, label: strings.personalize.shapes[value] })),
    (value) => pick({ shape: value }),
  );
  const character = choiceGroup(
    document,
    strings.personalize.character,
    characters.map(({ id, label }) => ({ value: id, label })),
    (value) => pick({ character: value }),
  );
  const language = choiceGroup(
    document,
    strings.personalize.language,
    languages.map((code) => ({ value: code, label: strings.setup[code].languageName, lang: code })),
    (value) => pick({ language: value }),
  );
  const done = document.createElement("button");
  done.type = "button";
  done.dataset.role = "done";
  done.textContent = strings.personalize.done;
  sheet.append(
    heading,
    name.element,
    hue.element,
    shape.element,
    character.element,
    language.element,
    done,
  );

  const sync = (current: Profile) => {
    if (document.activeElement !== name.input) name.input.value = current.name;
    hue.select(current.hue);
    shape.select(current.shape);
    character.select(current.character);
    language.select(current.language);
  };

  return { element: sheet, done, firstControl: name.input, sync };
}
