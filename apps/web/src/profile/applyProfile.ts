import { inkFor } from "../flip/color";
import { directionOf } from "./languages";
import type { Profile } from "./profile";

const DARK_THEME = "#000000";

function themeColorFor(document: Document, profile: Profile): string {
  if (profile.vision !== "full") return DARK_THEME;
  const style = document.defaultView?.getComputedStyle(document.documentElement);
  return style?.getPropertyValue("--bg").trim() || DARK_THEME;
}

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
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = themeColorFor(document, profile);
}
