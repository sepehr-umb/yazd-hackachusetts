import { defaultProfile, mergeProfile } from "./profile";
import type { Profile } from "./profile";

export type KeyValueStorage = {
  get(key: string): string | null | undefined;
  set(key: string, value: string): unknown;
};

export type ProfileListener = (profile: Profile) => void;

export type ProfileStore = {
  get(): Profile;
  update(patch: Partial<Profile>): void;
  subscribe(listener: ProfileListener): () => void;
};

export const PROFILE_KEY = "yazd.profile";

function load(storage: KeyValueStorage): Profile {
  try {
    const saved = storage.get(PROFILE_KEY);
    return saved ? mergeProfile(defaultProfile, JSON.parse(saved)) : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

function save(storage: KeyValueStorage, profile: Profile): boolean {
  try {
    storage.set(PROFILE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

export function createProfileStore(storage: KeyValueStorage): ProfileStore {
  let profile = load(storage);
  const listeners = new Set<ProfileListener>();
  return {
    get: () => profile,
    update(patch) {
      profile = mergeProfile(profile, patch);
      save(storage, profile);
      listeners.forEach((listener) => listener(profile));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function browserStorage(getStorage: () => Storage): KeyValueStorage {
  return {
    get: (key) => getStorage().getItem(key),
    set: (key, value) => getStorage().setItem(key, value),
  };
}
