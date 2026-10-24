import { defaultSettings } from "@mahmood/contracts";
import type { AssistantEvent } from "@mahmood/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssistantEventListener } from "../events/assistantEventSource";
import { settingsStorageKey } from "./settingsStorage";
import { createSettingsStore } from "./settingsStore";

function createEvents() {
  const listeners = new Set<AssistantEventListener>();
  return {
    source: {
      subscribe(listener: AssistantEventListener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    emit: (event: AssistantEvent) => listeners.forEach((listener) => listener(event)),
  };
}

const slower: AssistantEvent = { type: "setting_changed", name: "speechRate", value: 0.8 };

describe("createSettingsStore", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("starts from defaults when storage is empty or unavailable", () => {
    const events = createEvents();
    expect(createSettingsStore({ events: events.source, storage: localStorage }).get()).toEqual(defaultSettings);
    expect(createSettingsStore({ events: events.source, storage: null }).get()).toEqual(defaultSettings);
  });

  it("tracks events without any surface and stops after dispose", () => {
    const events = createEvents();
    const store = createSettingsStore({ events: events.source, storage: localStorage });
    events.emit(slower);
    expect(store.get().speechRate).toBe(0.8);
    store.dispose();
    events.emit({ type: "setting_changed", name: "speechRate", value: 1.2 });
    expect(store.get().speechRate).toBe(0.8);
  });

  it("notifies subscribers once per real change and never for the rest", () => {
    const events = createEvents();
    const store = createSettingsStore({ events: events.source, storage: localStorage });
    const listener = vi.fn();
    const unsubscribed = vi.fn();
    store.subscribe(listener);
    store.subscribe(unsubscribed)();
    events.emit(slower);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ speechRate: 0.8 }));
    events.emit({ type: "setting_changed", name: "speechRate", value: 9 } as unknown as AssistantEvent);
    events.emit({ type: "state", state: "idle" });
    events.emit(slower);
    expect(listener).toHaveBeenCalledTimes(1);
    events.emit({ type: "settings_reset" });
    expect(listener).toHaveBeenCalledTimes(2);
    events.emit({ type: "settings_reset" });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(unsubscribed).not.toHaveBeenCalled();
  });

  it("persists every change and restores it in a new store", () => {
    const events = createEvents();
    createSettingsStore({ events: events.source, storage: localStorage });
    events.emit(slower);
    expect(JSON.parse(localStorage.getItem(settingsStorageKey) ?? "")).toEqual({ ...defaultSettings, speechRate: 0.8 });
    expect(createSettingsStore({ events: events.source, storage: localStorage }).get().speechRate).toBe(0.8);
    events.emit({ type: "settings_reset" });
    expect(JSON.parse(localStorage.getItem(settingsStorageKey) ?? "")).toEqual(defaultSettings);
  });

  it("keeps state and retries the write after a failed write", () => {
    const events = createEvents();
    const written: string[] = [];
    let failures = 1;
    const storage = {
      getItem: () => null,
      setItem: (_key: string, value: string) => {
        if (failures-- > 0) throw new Error("quota");
        written.push(value);
      },
    } as unknown as Storage;
    const store = createSettingsStore({ events: events.source, storage });
    const listener = vi.fn();
    store.subscribe(listener);
    events.emit(slower);
    expect(store.get().speechRate).toBe(0.8);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(written).toEqual([]);
    events.emit({ type: "setting_changed", name: "silenceWaitMs", value: 2000 });
    expect(JSON.parse(written[0] ?? "")).toEqual({ ...defaultSettings, speechRate: 0.8, silenceWaitMs: 2000 });
  });
});
