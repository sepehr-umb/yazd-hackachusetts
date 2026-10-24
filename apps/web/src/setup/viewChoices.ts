import { strings } from "@mahmood/strings";
import { visions } from "../profile/profile";
import type { ProfileStore } from "../profile/profileStore";

export type ViewChoices = { element: HTMLFieldSetElement; dispose(): void };

export function createViewChoices(
  document: Document,
  profile: ProfileStore,
  onChoose: () => void = () => {},
): ViewChoices {
  const fieldset = document.createElement("fieldset");
  fieldset.dataset.role = "view";
  const legend = document.createElement("legend");
  legend.dir = "auto";
  const options = document.createElement("div");
  options.dataset.role = "options";
  fieldset.append(legend, options);

  const render = () => {
    const { language, vision: current } = profile.get();
    const copy = strings.setup[language].view;
    legend.lang = language;
    legend.textContent = copy.title;
    const buttons = visions.map((vision) => {
      const button = document.createElement("button");
      button.type = "button";
      button.lang = language;
      button.dir = "auto";
      button.dataset.vision = vision;
      button.textContent = copy[vision];
      button.setAttribute("aria-pressed", String(vision === current));
      button.addEventListener("click", () => {
        onChoose();
        profile.update({ vision });
      });
      return button;
    });
    options.replaceChildren(...buttons);
  };

  render();
  return { element: fieldset, dispose: profile.subscribe(render) };
}
