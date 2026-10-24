import type { ShortcutKind } from "./shortcuts";

const SVG = "http://www.w3.org/2000/svg";

const shapes: Record<ShortcutKind, string[]> = {
  call: [
    "M15 6h5.5a2 2 0 0 1 1.9 1.4l2.4 7.7a2 2 0 0 1-.7 2.2l-3.6 2.7a24 24 0 0 0 9.5 9.5l2.7-3.6a2 2 0 0 1 2.2-.7l7.7 2.4a2 2 0 0 1 1.4 1.9V35a7 7 0 0 1-7 7C20.3 42 6 27.7 6 13a7 7 0 0 1 7-7z",
  ],
  light: [
    "M24 4a14 14 0 0 0-8 25.5V33a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5A14 14 0 0 0 24 4z",
    "M18 38h12a2 2 0 0 1 0 4H18a2 2 0 0 1 0-4z",
  ],
  tv: [
    "M9 8h30a4 4 0 0 1 4 4v19a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z",
    "M17 39h14a2 2 0 0 1 0 4H17a2 2 0 0 1 0-4z",
  ],
};

export function iconFor(document: Document, kind: ShortcutKind): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 48 48");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("fill", "currentColor");
  svg.dataset.icon = kind;
  for (const d of shapes[kind]) {
    const path = document.createElementNS(SVG, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}
