import type { Profile, Vision } from "../profile/profile";
import type { Settings } from "./surface";

export type LayoutOptions = { debug: boolean };

const sighted = ["shortcuts", "companion", "captions", "textInput", "personalize", "setup"];

const layouts: Record<Vision | "unset", string[]> = {
  unset: ["setup"],
  full: sighted,
  low: sighted,
  minimal: ["fullscreen", "setup"],
};

export function settingsFor(
  profile: Profile,
  { debug }: LayoutOptions = { debug: false },
): Settings {
  const ids = layouts[profile.vision ?? "unset"];
  const shown = debug && profile.vision ? [...ids, "activityPanel"] : ids;
  return { surfaces: Object.fromEntries(shown.map((id) => [id, true])) };
}
