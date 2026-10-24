import { isLanguage } from "./languages";
import type { Language } from "./languages";

export const shapes = ["circle", "blob", "ring"] as const;
export type Shape = (typeof shapes)[number];

export const visions = ["full", "low", "minimal"] as const;
export type Vision = (typeof visions)[number];

export type Profile = {
  name: string;
  hue: number;
  shape: Shape;
  character: string;
  language: Language;
  vision?: Vision;
  flipIdle: string;
  flipListening: string;
};

export const defaultProfile: Profile = {
  name: "yazd",
  hue: 30,
  shape: "circle",
  character: "face",
  language: "fa",
  flipIdle: "#000000",
  flipListening: "#FFE600",
};

const MAX_NAME_LENGTH = 40;
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

const nonEmpty = (value: unknown) =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

const hexColor = (value: unknown) =>
  typeof value === "string" && HEX_COLOR.test(value) ? value.toUpperCase() : undefined;

const validators: { [K in keyof Profile]-?: (value: unknown) => Profile[K] | undefined } = {
  name: (value) => nonEmpty(value)?.slice(0, MAX_NAME_LENGTH),
  hue: (value) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 360
      ? value
      : undefined,
  shape: (value) => shapes.find((shape) => shape === value),
  character: nonEmpty,
  language: (value) => (isLanguage(value) ? value : undefined),
  vision: (value) => visions.find((vision) => vision === value),
  flipIdle: hexColor,
  flipListening: hexColor,
};

export function mergeProfile(base: Profile, raw: unknown): Profile {
  if (typeof raw !== "object" || raw === null) return base;
  const fields = raw as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...base };
  for (const [key, validate] of Object.entries(validators)) {
    if (!(key in fields)) continue;
    merged[key] = validate(fields[key]) ?? base[key as keyof Profile];
  }
  return merged as Profile;
}
