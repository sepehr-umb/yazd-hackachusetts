import { activityPanelSurface } from "../activity/activityPanel";
import { faceSurface } from "../face/faceSurface";
import { textInputSurface } from "../textInput/textInput";
import type { Settings, Surface } from "./surface";

export const surfaceRegistry: Surface[] = [faceSurface, activityPanelSurface, textInputSurface];

export const defaultSettings: Settings = {
  surfaces: Object.fromEntries(surfaceRegistry.map((surface) => [surface.id, true])),
};
