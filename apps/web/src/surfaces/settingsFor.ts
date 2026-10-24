import type { Profile, Vision } from "../profile/profile";
import type { Settings } from "./surface";

const sighted = ["shortcuts", "companion", "captions", "textInput", "personalize", "setup"];

const layouts: Record<Vision | "unset", string[]> = {
  unset: ["setup"],
  full: sighted,
  low: sighted,
  minimal: ["fullscreen", "setup"],
};

export function settingsFor(profile: Profile): Settings {
  const ids = layouts[profile.vision ?? "unset"];
  return { surfaces: Object.fromEntries(ids.map((id) => [id, true])) };
}
