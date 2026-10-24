import { strings } from "@mahmood/strings";
import type { Character } from "../characters/character";
import { characterRegistry } from "../characters/registry";
import { languages as profileLanguages } from "../profile/languages";
import type { Language } from "../profile/languages";
import { createViewChoices } from "../setup/viewChoices";
import type { Surface } from "../surfaces/surface";
import { personalizeIcon } from "./personalizeIcon";
import { createSheet } from "./sheet";

export type PersonalizeSurfaceDeps = { characters?: Character[]; languages?: readonly Language[] };

export function createPersonalizeSurface({
  characters = characterRegistry,
  languages = profileLanguages,
}: PersonalizeSurfaceDeps = {}): Surface {
  return {
    id: "personalize",
    mount(host, context) {
      const document = host.ownerDocument;
      const opener = document.createElement("button");
      opener.type = "button";
      opener.dataset.role = "opener";
      opener.setAttribute("aria-label", strings.personalize.open);
      opener.setAttribute("aria-haspopup", "dialog");
      opener.append(personalizeIcon(document));
      const backdrop = document.createElement("div");
      backdrop.dataset.role = "backdrop";
      backdrop.hidden = true;
      const sheet = createSheet(document, { ...context, characters, languages });
      const view = createViewChoices(document, context.profile, () => close());
      sheet.element.querySelector("h2")?.after(view.element);
      const header = document.createElement("header");
      const name = document.createElement("p");
      name.dataset.role = "name";
      name.dir = "auto";
      header.append(name, opener);
      const showName = () => {
        name.textContent = context.profile.get().name;
      };
      showName();
      host.append(header, backdrop, sheet.element);

      const setOpen = (open: boolean) => {
        opener.setAttribute("aria-expanded", String(open));
        backdrop.hidden = !open;
        sheet.element.hidden = !open;
      };

      const open = () => {
        sheet.sync(context.profile.get());
        setOpen(true);
        sheet.firstControl.focus();
      };

      const close = () => {
        if (sheet.element.hidden) return;
        setOpen(false);
        opener.focus();
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") close();
      };

      opener.addEventListener("click", open);
      backdrop.addEventListener("click", close);
      sheet.done.addEventListener("click", close);
      sheet.setup.addEventListener("click", () => {
        close();
        context.setup.open();
      });
      document.addEventListener("keydown", onKeyDown);
      const stopSync = context.profile.subscribe(sheet.sync);
      const stopName = context.profile.subscribe(showName);
      const unsubscribe = () => {
        stopSync();
        stopName();
      };
      setOpen(false);

      return () => {
        view.dispose();
        unsubscribe();
        document.removeEventListener("keydown", onKeyDown);
        header.remove();
        backdrop.remove();
        sheet.element.remove();
      };
    },
  };
}

export const personalizeSurface = createPersonalizeSurface();
