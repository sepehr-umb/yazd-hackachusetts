import { randomUUID } from "node:crypto";

import type { SpeechAudio } from "./speechAudio";

export type { SpeechAudio };

export type SpeechStore = {
  put(audio: SpeechAudio): string;
  get(id: string): SpeechAudio | undefined;
  size(): number;
};

export type SpeechStoreConfig = { now?: () => number; ttlMs?: number };

const DEFAULT_TTL_MS = 60_000;

export function createSpeechStore({
  now = Date.now,
  ttlMs = DEFAULT_TTL_MS,
}: SpeechStoreConfig = {}): SpeechStore {
  const clips = new Map<string, { audio: SpeechAudio; expiresAt: number }>();

  const dropExpired = () => {
    for (const [id, clip] of clips) if (clip.expiresAt <= now()) clips.delete(id);
  };

  return {
    put(audio) {
      dropExpired();
      const id = randomUUID();
      clips.set(id, { audio, expiresAt: now() + ttlMs });
      return id;
    },
    get(id) {
      dropExpired();
      return clips.get(id)?.audio;
    },
    size: () => clips.size,
  };
}
