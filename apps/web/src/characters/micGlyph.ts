const SVG = "http://www.w3.org/2000/svg";
const MIC = [
  "M24 4a8 8 0 0 0-8 8v12a8 8 0 0 0 16 0V12a8 8 0 0 0-8-8z",
  "M10 22a2 2 0 0 1 4 0 10 10 0 0 0 20 0 2 2 0 0 1 4 0 14 14 0 0 1-12 13.9V40h5a2 2 0 0 1 0 4H17a2 2 0 0 1 0-4h5v-4.1A14 14 0 0 1 10 22z",
];

export function micGlyph(document: Document): HTMLSpanElement {
  const holder = document.createElement("span");
  holder.dataset.part = "mic";
  holder.setAttribute("aria-hidden", "true");
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 48 48");
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("focusable", "false");
  for (const d of MIC) {
    const path = document.createElementNS(SVG, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  holder.append(svg);
  return holder;
}
