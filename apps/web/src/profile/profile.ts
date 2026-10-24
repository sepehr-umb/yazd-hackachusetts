export const shapes = ["circle", "blob", "ring"] as const;
export type Shape = (typeof shapes)[number];

export type Profile = {
  name: string;
  hue: number;
  shape: Shape;
  character: string;
  language: string;
};

export const defaultProfile: Profile = {
  name: "yazd",
  hue: 30,
  shape: "circle",
  character: "face",
  language: "fa",
};

const MAX_NAME_LENGTH = 40;

const nonEmpty = (value: unknown) =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

const validators: { [K in keyof Profile]: (value: unknown) => Profile[K] | undefined } = {
  name: (value) => nonEmpty(value)?.slice(0, MAX_NAME_LENGTH),
  hue: (value) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 360
      ? value
      : undefined,
  shape: (value) => shapes.find((shape) => shape === value),
  character: nonEmpty,
  language: nonEmpty,
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
