import type { ProfileStore } from "./profileStore";

const PARAM = "reset";

export function applyResetParam(
  href: string,
  profile: ProfileStore,
  replaceUrl: (url: string) => void,
): void {
  const url = new URL(href);
  if (!url.searchParams.has(PARAM)) return;
  profile.reset();
  url.searchParams.delete(PARAM);
  replaceUrl(`${url.pathname}${url.search}${url.hash}`);
}
