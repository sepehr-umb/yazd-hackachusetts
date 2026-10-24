import { activityPanelSurface } from "../activity/activityPanel";
import { captionsSurface } from "../captions/captionsSurface";
import { companionSurface } from "../companion/companionSurface";
import { faceSurface } from "../face/faceSurface";
import { personalizeSurface } from "../personalize/personalizeSurface";
import { shortcutsSurface } from "../shortcuts/shortcutsSurface";
import { textInputSurface } from "../textInput/textInput";
import { voiceSurface } from "../voice/voiceSurface";
import type { Settings, Surface } from "./surface";

export const surfaceRegistry: Surface[] = [
  shortcutsSurface,
  companionSurface,
  captionsSurface,
  textInputSurface,
  personalizeSurface,
  faceSurface,
  voiceSurface,
  activityPanelSurface,
];

const offByDefault = new Set(["face", "voice", "activityPanel"]);

export const defaultSettings: Settings = {
  surfaces: Object.fromEntries(
    surfaceRegistry.map((surface) => [surface.id, !offByDefault.has(surface.id)]),
  ),
};
