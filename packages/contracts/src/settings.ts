export const captionSizes = ["small", "medium", "large", "extra-large"] as const;

export type CaptionSize = (typeof captionSizes)[number];

export const settingSchemas = {
  speechRate: { kind: "number", min: 0.5, max: 1.5, default: 1.0 },
  captionSize: { kind: "enum", values: captionSizes, default: "large" },
  highContrast: { kind: "boolean", default: true },
  silenceWaitMs: { kind: "integer", min: 800, max: 4000, default: 1500 },
} as const;

export type SettingName = keyof typeof settingSchemas;

export type Settings = {
  speechRate: number;
  captionSize: CaptionSize;
  highContrast: boolean;
  silenceWaitMs: number;
};

export type SettingValue<N extends SettingName = SettingName> = Settings[N];

export const defaultSettings: Settings = {
  speechRate: settingSchemas.speechRate.default,
  captionSize: settingSchemas.captionSize.default,
  highContrast: settingSchemas.highContrast.default,
  silenceWaitMs: settingSchemas.silenceWaitMs.default,
};
