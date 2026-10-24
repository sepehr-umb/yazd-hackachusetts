import { settingSchemas } from "@mahmood/contracts";
import type { SettingName, Settings } from "@mahmood/contracts";
import type { AssistantEventSource } from "../events/assistantEventSource";
import { applyEvent } from "./applyEvent";
import { loadSettings, saveSettings } from "./settingsStorage";

export type SettingsListener = (state: Settings) => void;

export type SettingsStore = {
  get(): Settings;
  subscribe(listener: SettingsListener): () => void;
  dispose(): void;
};

export type SettingsStoreDeps = {
  events: AssistantEventSource;
  storage: Storage | null;
};

const names = Object.keys(settingSchemas) as SettingName[];

function sameSettings(a: Settings, b: Settings): boolean {
  return names.every((name) => a[name] === b[name]);
}

export function createSettingsStore({ events, storage }: SettingsStoreDeps): SettingsStore {
  const listeners = new Set<SettingsListener>();
  let state = storage ? loadSettings(storage) : loadSettings({ getItem: () => null });

  const unsubscribe = events.subscribe((event) => {
    const next = applyEvent(state, event);
    if (sameSettings(next, state)) return;
    state = next;
    if (storage) saveSettings(storage, state);
    listeners.forEach((listener) => listener(state));
  });

  return {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      unsubscribe();
      listeners.clear();
    },
  };
}
