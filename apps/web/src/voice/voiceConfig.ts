export type VoiceConfig = {
  silenceThreshold: number;
  noSpeechTimeoutMs: number;
};

export const voiceConfig: VoiceConfig = {
  silenceThreshold: 0.02,
  noSpeechTimeoutMs: 8000,
};
