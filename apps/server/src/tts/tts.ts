import type { SpeechAudio } from "../speech/speechAudio";

export interface Tts {
  synthesize(text: string): Promise<SpeechAudio>;
}
