import type { Settings, Surface, SurfaceContext, Unmount } from "./surface";

export type MountSurfacesConfig = {
  registry: Surface[];
  settings: Settings;
  root: HTMLElement;
  context: SurfaceContext;
};

export function mountSurfaces({ registry, settings, root, context }: MountSurfacesConfig): Unmount {
  for (const surface of registry) {
    if (settings.surfaces[surface.id] !== true) continue;
    const host = root.ownerDocument.createElement("section");
    host.dataset.surface = surface.id;
    root.append(host);
    surface.mount(host, context);
  }
  return () => {};
}
