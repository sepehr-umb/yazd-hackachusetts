import { readFileSync } from "node:fs";
import type { Tts } from "./tts";

const fixture = readFileSync(new URL("./fixtures/speech.wav", import.meta.url));

export function createStubTts(): Tts {
  return { synthesize: async () => ({ data: fixture, mimeType: "audio/wav" }) };
}
