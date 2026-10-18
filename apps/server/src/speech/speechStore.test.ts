import { describe, expect, it } from "vitest";
import { createSpeechStore } from "./speechStore";

const audio = { data: Buffer.from([1, 2, 3]), mimeType: "audio/mpeg" };

function clockedStore() {
  let now = 0;
  const store = createSpeechStore({ now: () => now });
  return { store, advance: (ms: number) => (now += ms) };
}

describe("speechStore", () => {
  it("returns stored audio by the id it handed out", () => {
    const { store } = clockedStore();

    const id = store.put(audio);

    expect(store.get(id)).toEqual(audio);
  });

  it("hands out a different id for each clip", () => {
    const { store } = clockedStore();

    expect(store.put(audio)).not.toBe(store.put(audio));
  });

  it("returns undefined for an unknown id", () => {
    expect(clockedStore().store.get("nope")).toBeUndefined();
  });

  it("keeps audio for 60 seconds and then forgets it", () => {
    const { store, advance } = clockedStore();
    const id = store.put(audio);

    advance(59_999);
    expect(store.get(id)).toEqual(audio);
    advance(1);
    expect(store.get(id)).toBeUndefined();
  });

  it("drops expired clips when new audio arrives", () => {
    const { store, advance } = clockedStore();
    store.put(audio);
    advance(60_000);
    store.put(audio);

    expect(store.size()).toBe(1);
  });
});
