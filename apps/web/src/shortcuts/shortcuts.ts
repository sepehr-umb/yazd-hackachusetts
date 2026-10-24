export type ShortcutKind = "call" | "light" | "tv";
export type ShortcutText = { label: string; phrase: string };
export type Shortcut = { id: string; kind: ShortcutKind; text: Record<string, ShortcutText> };

export const DISPLAY_LANGUAGE = "fa";

const said = (fa: string, en: string) => ({
  fa: { label: fa, phrase: fa },
  en: { label: en, phrase: en },
});

export const shortcuts: Shortcut[] = [
  { id: "callMom", kind: "call", text: said("به مامان زنگ بزن", "Call Mom") },
  { id: "callDad", kind: "call", text: said("به بابا زنگ بزن", "Call Dad") },
  { id: "lightsOn", kind: "light", text: said("چراغ آشپزخانه را روشن کن", "Kitchen light on") },
  { id: "lightsOff", kind: "light", text: said("چراغ آشپزخانه را خاموش کن", "Kitchen light off") },
  { id: "tvPlay", kind: "tv", text: said("تلویزیون را پخش کن", "Play TV") },
  { id: "tvPause", kind: "tv", text: said("تلویزیون را متوقف کن", "Pause TV") },
];
