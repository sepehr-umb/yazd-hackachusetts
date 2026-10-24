import { describe, expect, it } from "vitest";
import type { Clock } from "../clock/clock";
import { PENDING_TTL_MS, createPendingQuestion } from "./pendingQuestion";

function fakeClock(start = 0) {
  let now = start;
  const clock: Clock = { now: () => new Date(now) };
  return { clock, advance: (ms: number) => (now += ms) };
}

const pending = { request: "call Ahmadi", question: "Which one?" };

describe("pendingQuestion", () => {
  it("returns the value at exactly the TTL", () => {
    const { clock, advance } = fakeClock();
    const store = createPendingQuestion({ clock });
    store.set(pending);
    advance(PENDING_TTL_MS);
    expect(store.consume()).toEqual(pending);
  });

  it("returns undefined one millisecond past the TTL", () => {
    const { clock, advance } = fakeClock();
    const store = createPendingQuestion({ clock });
    store.set(pending);
    advance(PENDING_TTL_MS + 1);
    expect(store.consume()).toBeUndefined();
  });

  it("returns the value only once", () => {
    const store = createPendingQuestion({ clock: fakeClock().clock });
    store.set(pending);
    store.consume();
    expect(store.consume()).toBeUndefined();
  });

  it("empties on clear", () => {
    const store = createPendingQuestion({ clock: fakeClock().clock });
    store.set(pending);
    store.clear();
    expect(store.consume()).toBeUndefined();
  });

  it("overwrites on set", () => {
    const store = createPendingQuestion({ clock: fakeClock().clock });
    store.set(pending);
    store.set({ request: "other", question: "Why?" });
    expect(store.consume()).toEqual({ request: "other", question: "Why?" });
  });
});
