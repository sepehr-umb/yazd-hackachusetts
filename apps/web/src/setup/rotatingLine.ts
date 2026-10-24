export type Line = { text: string; lang: string };
export type Rotation = { stop(): void };

const EVERY_MS = 3000;
const FADE_MS = 300;

export function rotateLines(
  element: HTMLElement,
  lines: Line[],
  reducedMotion: () => boolean,
): Rotation {
  let index = 0;
  let fade: ReturnType<typeof setTimeout> | undefined;
  const show = () => {
    const line = lines[index % lines.length];
    if (!line) return;
    element.textContent = line.text;
    element.lang = line.lang;
    delete element.dataset.fading;
  };
  show();
  const timer = setInterval(() => {
    index += 1;
    if (reducedMotion()) return show();
    element.dataset.fading = "true";
    fade = setTimeout(show, FADE_MS);
  }, EVERY_MS);
  return {
    stop() {
      clearInterval(timer);
      clearTimeout(fade);
      delete element.dataset.fading;
    },
  };
}
