export type VoiceConfig = {
  silenceThreshold: number;
  silenceTimeoutMs: number;
  noSpeechTimeoutMs: number;
};

export const voiceConfig: VoiceConfig = {
  silenceThreshold: 0.02,
  silenceTimeoutMs: 2000,
  noSpeechTimeoutMs: 8000,
};
