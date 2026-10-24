const visuallyHidden: Partial<CSSStyleDeclaration> = {
  position: "absolute",
  insetBlockStart: "0",
  insetInlineStart: "0",
  width: "1px",
  height: "1px",
  margin: "-1px",
  padding: "0",
  border: "0",
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
};

export function createSettingsButton(document: Document, open: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.role = "settings";
  button.dir = "auto";
  Object.assign(button.style, visuallyHidden);
  button.addEventListener("click", open);
  return button;
}
