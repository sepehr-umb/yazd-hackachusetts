import { inkFor } from "../flip/color";
import { directionOf } from "./languages";
import type { Profile } from "./profile";

export function applyProfile(document: Document, profile: Profile): void {
  const root = document.documentElement;
  root.lang = profile.language;
  root.dir = directionOf(profile.language);
  if (profile.vision) root.dataset.vision = profile.vision;
  else delete root.dataset.vision;
  root.style.setProperty("--flip-idle", profile.flipIdle);
  root.style.setProperty("--flip-listening", profile.flipListening);
  root.style.setProperty("--flip-idle-ink", inkFor(profile.flipIdle));
  root.style.setProperty("--flip-listening-ink", inkFor(profile.flipListening));
}
