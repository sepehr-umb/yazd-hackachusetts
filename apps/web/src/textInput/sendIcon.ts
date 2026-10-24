const SVG = "http://www.w3.org/2000/svg";
const ARROW =
  "M24 8a2 2 0 0 1 1.4.6l12 12a2 2 0 0 1-2.8 2.8L26 14.8V38a2 2 0 0 1-4 0V14.8l-8.6 8.6a2 2 0 0 1-2.8-2.8l12-12A2 2 0 0 1 24 8z";

export function sendIcon(document: Document): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 48 48");
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", ARROW);
  svg.append(path);
  return svg;
}
