import { visions } from "../profile/profile";
import type { ProfileStore } from "../profile/profileStore";

const PARAM = "vision";

export function applyVisionParam(
  href: string,
  profile: ProfileStore,
  replaceUrl: (url: string) => void,
): void {
  const url = new URL(href);
  if (!url.searchParams.has(PARAM)) return;
  const vision = visions.find((candidate) => candidate === url.searchParams.get(PARAM));
  if (vision) profile.update({ vision });
  url.searchParams.delete(PARAM);
  replaceUrl(`${url.pathname}${url.search}${url.hash}`);
}
