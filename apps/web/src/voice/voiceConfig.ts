export type VoiceConfig = { silenceThreshold: number; silenceTimeoutMs: number };

export const voiceConfig: VoiceConfig = { silenceThreshold: 0.02, silenceTimeoutMs: 1500 };
