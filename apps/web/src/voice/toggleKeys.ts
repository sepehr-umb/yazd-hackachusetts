const TOGGLE_KEYS = [" ", "Enter"];
const OWN_KEY_HANDLERS = "input, textarea, select, button, a, [contenteditable]";

export function isToggleKey(event: KeyboardEvent): boolean {
  if (!TOGGLE_KEYS.includes(event.key)) return false;
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return false;
  return !(event.target as Element | null)?.closest?.(OWN_KEY_HANDLERS);
}

export function onToggleKey(document: Document, toggle: () => void): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (!isToggleKey(event)) return;
    event.preventDefault();
    toggle();
  };
  document.addEventListener("keydown", onKeyDown);
  return () => document.removeEventListener("keydown", onKeyDown);
}
