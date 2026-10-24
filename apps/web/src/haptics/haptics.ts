export type HapticKind = "start" | "stop";
export type Haptic = (kind: HapticKind) => void;

export type HapticsDeps = {
  document: Document;
  vibrate?: (pattern: number[]) => boolean;
  supportsSwitch: boolean;
};

const patterns: Record<HapticKind, number[]> = { start: [60], stop: [40, 60, 40] };
const SECOND_TAP_MS = 100;

function createSwitch(document: Document) {
  const label = document.createElement("label");
  label.setAttribute("aria-hidden", "true");
  label.dataset.role = "haptic";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.tabIndex = -1;
  label.append(input);
  document.body.append(label);
  return label;
}

export function createHaptics({ document, vibrate, supportsSwitch }: HapticsDeps): Haptic {
  let label: HTMLLabelElement | undefined;
  const tap = () => {
    label ??= createSwitch(document);
    label.click();
  };
  return (kind) => {
    try {
      if (vibrate) {
        vibrate(patterns[kind]);
        return;
      }
      if (!supportsSwitch) return;
      tap();
      if (kind === "stop") setTimeout(tap, SECOND_TAP_MS);
    } catch {
      return;
    }
  };
}
