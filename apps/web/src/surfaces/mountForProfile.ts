import type { Profile } from "../profile/profile";
import { mountSurfaces } from "./mountSurfaces";
import type { Settings, Surface, SurfaceContext, Unmount } from "./surface";

export type MountForProfileConfig = {
  registry: Surface[];
  settingsFor: (profile: Profile) => Settings;
  root: HTMLElement;
  context: SurfaceContext;
};

const layoutKey = (settings: Settings, profile: Profile) =>
  JSON.stringify([settings.surfaces, profile.vision ?? null]);

export function mountForProfile({
  registry,
  settingsFor,
  root,
  context,
}: MountForProfileConfig): Unmount {
  let key = "";
  let unmount: Unmount = () => {};
  const show = (profile: Profile) => {
    const settings = settingsFor(profile);
    const next = layoutKey(settings, profile);
    if (next === key) return;
    unmount();
    key = next;
    unmount = mountSurfaces({ registry, settings, root, context });
  };
  show(context.profile.get());
  const unsubscribe = context.profile.subscribe(show);
  return () => {
    unsubscribe();
    unmount();
  };
}
