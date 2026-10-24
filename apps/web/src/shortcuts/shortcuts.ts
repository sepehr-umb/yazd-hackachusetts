export type ShortcutKind = "call" | "light" | "tv";
export type ShortcutText = { label: string; phrase: string };
export type Shortcut = { id: string; kind: ShortcutKind; text: Record<string, ShortcutText> };

const said = (fa: string, en: string, es: string, it: string) => ({
  fa: { label: fa, phrase: fa },
  en: { label: en, phrase: en },
  es: { label: es, phrase: es },
  it: { label: it, phrase: it },
});

export const shortcuts: Shortcut[] = [
  {
    id: "callMom",
    kind: "call",
    text: said("به مامان زنگ بزن", "Call Mom", "Llama a mamá", "Chiama la mamma"),
  },
  {
    id: "callDad",
    kind: "call",
    text: said("به بابا زنگ بزن", "Call Dad", "Llama a papá", "Chiama papà"),
  },
  {
    id: "lightsOn",
    kind: "light",
    text: said(
      "چراغ آشپزخانه را روشن کن",
      "Kitchen light on",
      "Enciende la luz de la cocina",
      "Accendi la luce della cucina",
    ),
  },
  {
    id: "lightsOff",
    kind: "light",
    text: said(
      "چراغ آشپزخانه را خاموش کن",
      "Kitchen light off",
      "Apaga la luz de la cocina",
      "Spegni la luce della cucina",
    ),
  },
  {
    id: "tvPlay",
    kind: "tv",
    text: said("تلویزیون را پخش کن", "Play TV", "Reproduce la tele", "Riproduci la TV"),
  },
  {
    id: "tvPause",
    kind: "tv",
    text: said("تلویزیون را متوقف کن", "Pause TV", "Pausa la tele", "Metti in pausa la TV"),
  },
];
