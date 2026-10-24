const SVG = "http://www.w3.org/2000/svg";

const strokes = ["M10 14h28", "M10 24h28", "M10 34h28"];
const knobs = [
  { cx: 18, cy: 14 },
  { cx: 30, cy: 24 },
  { cx: 22, cy: 34 },
];

export function personalizeIcon(document: Document): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 48 48");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "3");
  svg.setAttribute("stroke-linecap", "round");
  for (const d of strokes) {
    const path = document.createElementNS(SVG, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  for (const { cx, cy } of knobs) {
    const knob = document.createElementNS(SVG, "circle");
    knob.setAttribute("cx", String(cx));
    knob.setAttribute("cy", String(cy));
    knob.setAttribute("r", "4");
    knob.setAttribute("fill", "var(--surface, #fff)");
    svg.append(knob);
  }
  return svg;
}
