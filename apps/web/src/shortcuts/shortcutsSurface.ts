import { strings } from "@mahmood/strings";
import type { Surface } from "../surfaces/surface";
import { iconFor } from "./shortcutIcons";
import { DISPLAY_LANGUAGE, shortcuts as seededShortcuts } from "./shortcuts";
import type { Shortcut } from "./shortcuts";

export type ShortcutsSurfaceDeps = { shortcuts?: Shortcut[]; language?: () => string };

function textSpan(document: Document, role: string, language: string, text: string) {
  const span = document.createElement("span");
  span.dataset.role = role;
  span.lang = language;
  span.dir = "auto";
  span.textContent = text;
  return span;
}

function shortcutButton(document: Document, shortcut: Shortcut, language: string) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.shortcut = shortcut.id;
  button.dataset.kind = shortcut.kind;
  button.append(iconFor(document, shortcut.kind));
  const shown = shortcut.text[language];
  if (shown) button.append(textSpan(document, "label", language, shown.label));
  const other = Object.keys(shortcut.text).find((candidate) => candidate !== language);
  const otherText = other ? shortcut.text[other] : undefined;
  if (other && otherText) button.append(textSpan(document, "sublabel", other, otherText.label));
  return button;
}

export function createShortcutsSurface({
  shortcuts = seededShortcuts,
  language = () => DISPLAY_LANGUAGE,
}: ShortcutsSurfaceDeps = {}): Surface {
  return {
    id: "shortcuts",
    mount(host, context) {
      const document = host.ownerDocument;
      const grid = document.createElement("div");
      grid.setAttribute("role", "group");
      grid.setAttribute("aria-label", strings.shortcuts.title);
      host.append(grid);
      let busy = false;

      const setBusy = (value: boolean) => {
        busy = value;
        for (const button of grid.querySelectorAll("button")) {
          button.setAttribute("aria-disabled", String(value));
          if (!value) delete button.dataset.pressed;
        }
      };

      const press = async (button: HTMLButtonElement, phrase: string) => {
        if (busy) return;
        setBusy(true);
        button.dataset.pressed = "true";
        await context.requests.submit(phrase).catch(() => undefined);
        setBusy(false);
      };

      const shown = language();
      for (const shortcut of shortcuts) {
        const phrase = shortcut.text[shown]?.phrase;
        if (phrase === undefined) continue;
        const button = shortcutButton(document, shortcut, shown);
        button.addEventListener("click", () => void press(button, phrase));
        grid.append(button);
      }
      setBusy(false);

      return () => grid.remove();
    },
  };
}

export const shortcutsSurface = createShortcutsSurface();
