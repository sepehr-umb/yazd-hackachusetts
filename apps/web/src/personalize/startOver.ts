import { strings } from "@mahmood/strings";
import type { ProfileStore } from "../profile/profileStore";

export type StartOver = { element: HTMLButtonElement; dispose(): void };

export function createStartOver(
  document: Document,
  profile: ProfileStore,
  onStartOver: () => void,
): StartOver {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.role = "start-over";
  button.dir = "auto";
  const label = () => {
    const { language } = profile.get();
    button.lang = language;
    button.textContent = strings.setup[language].startOver;
  };
  label();
  button.addEventListener("click", onStartOver);
  return { element: button, dispose: profile.subscribe(label) };
}
