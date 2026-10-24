import { describe, expect, it } from "vitest";
import { playChime } from "./chime";
import type { ChimeContext } from "./chime";

function fakeContext() {
  const notes: Array<{ frequency: number; startAt: number; stopAt: number; connected: unknown }> =
    [];
  const destination = { name: "destination" };
  const context = {
    currentTime: 10,
    destination,
    createGain: () => ({ gain: { value: 1 }, connect: (node: unknown) => node }),
    createOscillator: () => {
      const note = { frequency: 0, startAt: -1, stopAt: -1, connected: undefined as unknown };
      notes.push(note);
      return {
        frequency: {
          set value(hz: number) {
            note.frequency = hz;
          },
        },
        connect: (node: unknown) => {
          note.connected = node;
          return node;
        },
        start: (at: number) => (note.startAt = at),
        stop: (at: number) => (note.stopAt = at),
      };
    },
  } as unknown as ChimeContext;
  return { context, notes };
}

describe("playChime", () => {
  it("plays two rising notes back to back when recording starts", () => {
    const { context, notes } = fakeContext();

    playChime(context, "start");

    expect(notes.map((note) => note.frequency)).toEqual([660, 880]);
    expect(notes[0]?.startAt).toBe(10);
    expect(notes[1]?.startAt).toBe(notes[0]?.stopAt);
    expect((notes[1]?.stopAt ?? 0) - 10).toBeLessThan(0.5);
  });

  it("plays two falling notes when recording stops", () => {
    const { context, notes } = fakeContext();

    playChime(context, "stop");

    expect(notes.map((note) => note.frequency)).toEqual([880, 660]);
  });
});
