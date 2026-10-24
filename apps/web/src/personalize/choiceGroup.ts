export type Choice<T> = { value: T; label: string; lang?: string; hue?: number };

export type ChoiceGroup<T> = { element: HTMLFieldSetElement; select(value: T): void };

export function choiceGroup<T>(
  document: Document,
  legend: string,
  choices: Choice<T>[],
  onPick: (value: T) => void,
): ChoiceGroup<T> {
  const fieldset = document.createElement("fieldset");
  const title = document.createElement("legend");
  title.textContent = legend;
  const options = document.createElement("div");
  options.dataset.role = "options";
  fieldset.append(title, options);
  const buttons = choices.map((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dir = "auto";
    button.textContent = choice.label;
    if (choice.lang) button.lang = choice.lang;
    if (choice.hue !== undefined) {
      button.setAttribute("aria-label", choice.label);
      button.dataset.role = "swatch";
      button.style.setProperty("--hue", String(choice.hue));
    }
    button.addEventListener("click", () => onPick(choice.value));
    options.append(button);
    return { button, value: choice.value };
  });
  return {
    element: fieldset,
    select(value) {
      for (const { button, value: own } of buttons) {
        button.setAttribute("aria-pressed", String(own === value));
      }
    },
  };
}
