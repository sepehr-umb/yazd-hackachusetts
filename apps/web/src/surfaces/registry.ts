import { activityPanelSurface } from "../activity/activityPanel";
import { captionsSurface } from "../captions/captionsSurface";
import { companionSurface } from "../companion/companionSurface";
import { faceSurface } from "../face/faceSurface";
import { fullscreenSurface } from "../fullscreen/fullscreenSurface";
import { personalizeSurface } from "../personalize/personalizeSurface";
import { shortcutsSurface } from "../shortcuts/shortcutsSurface";
import { textInputSurface } from "../textInput/textInput";
import { voiceSurface } from "../voice/voiceSurface";
import type { Surface } from "./surface";

export const surfaceRegistry: Surface[] = [
  fullscreenSurface,
  shortcutsSurface,
  companionSurface,
  captionsSurface,
  textInputSurface,
  personalizeSurface,
  faceSurface,
  voiceSurface,
  activityPanelSurface,
];
