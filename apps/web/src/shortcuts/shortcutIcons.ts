import type { ShortcutKind } from "./shortcuts";

const SVG = "http://www.w3.org/2000/svg";

const strokes: Record<ShortcutKind, string[]> = {
  call: [
    "M15 7h6l3 9-4.5 3a23 23 0 0 0 10.5 10.5l3-4.5 9 3v6a4 4 0 0 1-4 4C21.5 38 10 26.5 10 12a5 5 0 0 1 5-5z",
  ],
  light: ["M24 6a12 12 0 0 0-7 21.7V32h14v-4.3A12 12 0 0 0 24 6z", "M18 37h12", "M20 42h8"],
  tv: [
    "M9 10h30a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3z",
    "M24 34v6",
    "M17 41h14",
  ],
};

export function iconFor(document: Document, kind: ShortcutKind): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 48 48");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "3");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.dataset.icon = kind;
  for (const d of strokes[kind]) {
    const path = document.createElementNS(SVG, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}
