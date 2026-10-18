import type { SpeechAudio } from "../speech/speechAudio";

export interface Stt {
  transcribe(recording: SpeechAudio): Promise<string>;
}
