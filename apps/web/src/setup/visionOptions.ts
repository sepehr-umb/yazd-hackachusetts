import { strings } from "@mahmood/strings";
import type { Language } from "../profile/languages";
import { visions } from "../profile/profile";
import type { Vision } from "../profile/profile";
import type { Narrator } from "./narrator";
import type { SetupOption } from "./setupOptions";

export function visionOptions(
  language: Language,
  narrator: Narrator,
  choose: (vision: Vision) => void,
): SetupOption[] {
  const copy = strings.setup[language];
  return visions.map((vision, index) => ({
    text: copy.vision[vision],
    detail: copy.visionDetail[vision],
    number: String(index + 1),
    language,
    onFocus: () => {
      narrator.stop();
      narrator.say(copy.vision[vision], language);
    },
    onChoose: () => choose(vision),
  }));
}
