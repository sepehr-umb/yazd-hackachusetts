export type PressOrHold = { onPress: () => void; onHold?: () => void; holdMs?: number };

const HOLD_MS = 2000;

export function onPressOrHold(
  element: HTMLElement,
  { onPress, onHold, holdMs = HOLD_MS }: PressOrHold,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let held = false;

  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  const onDown = (event: PointerEvent) => {
    if (!onHold || !event.isPrimary || event.button !== 0) return;
    cancel();
    held = false;
    timer = setTimeout(() => {
      timer = undefined;
      held = true;
      onHold();
    }, holdMs);
  };
  const onClick = (event: MouseEvent) => {
    if (held) {
      held = false;
      event.preventDefault();
      return;
    }
    onPress();
  };
  const onMenu = (event: Event) => event.preventDefault();

  element.addEventListener("pointerdown", onDown);
  element.addEventListener("pointerup", cancel);
  element.addEventListener("pointercancel", cancel);
  element.addEventListener("pointerleave", cancel);
  element.addEventListener("click", onClick);
  element.addEventListener("contextmenu", onMenu);
  return () => {
    cancel();
    element.removeEventListener("pointerdown", onDown);
    element.removeEventListener("pointerup", cancel);
    element.removeEventListener("pointercancel", cancel);
    element.removeEventListener("pointerleave", cancel);
    element.removeEventListener("click", onClick);
    element.removeEventListener("contextmenu", onMenu);
  };
}
