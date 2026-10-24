import { activityPanelSurface } from "../activity/activityPanel";
import { faceSurface } from "../face/faceSurface";
import { textInputSurface } from "../textInput/textInput";
import { voiceSurface } from "../voice/voiceSurface";
import type { Settings, Surface } from "./surface";

export const surfaceRegistry: Surface[] = [
  faceSurface,
  activityPanelSurface,
  textInputSurface,
  voiceSurface,
];

export const defaultSettings: Settings = {
  surfaces: Object.fromEntries(surfaceRegistry.map((surface) => [surface.id, true])),
};
