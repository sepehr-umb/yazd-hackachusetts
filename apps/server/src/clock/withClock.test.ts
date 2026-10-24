import { toolNames } from "@mahmood/contracts";
import { strings } from "@mahmood/strings";
import { describe, expect, it } from "vitest";
import { createStubTools } from "../orchestrator";
import { createRecordingEventBus } from "../orchestrator/testing/recordingEventBus";
import type { Clock } from "./clock";
import { withClock } from "./withClock";

function fakeClock(...readings: Array<Date | Error>): Clock & { reads: number } {
  const clock = {
    reads: 0,
    now() {
      const reading = readings[Math.min(clock.reads, readings.length - 1)] as Date | Error;
      clock.reads += 1;
      if (reading instanceof Error) throw reading;
      return reading;
    },
  };
  return clock;
}

function setup(clock: Clock) {
  const bus = createRecordingEventBus();
  const stub = createStubTools();
  return { tools: withClock(stub.tools, clock), calls: stub.calls, bus, stub };
}

const unavailable = { ok: true, output: { applied: false, error: strings.clock.unavailable } };

describe("withClock get_time", () => {
  it("returns the local hour, minute, and weekday of the clock's moment", async () => {
    const { tools } = setup(fakeClock(new Date(2024, 0, 15, 14, 5, 30)));

    const result = await tools.get_time.execute({});

    expect(result).toEqual({
      ok: true,
      output: { applied: true, hour: 14, minute: 5, weekday: "Monday" },
    });
  });

  it("reports unavailable when the clock throws, then recovers on the next call", async () => {
    const clock = fakeClock(new Error("broken"), new Date(2024, 0, 21, 0, 0));
    const { tools } = setup(clock);

    expect(await tools.get_time.execute({})).toEqual(unavailable);
    expect(await tools.get_time.execute({})).toEqual({
      ok: true,
      output: { applied: true, hour: 0, minute: 0, weekday: "Sunday" },
    });
  });

  it("reports unavailable when the clock returns an invalid date", async () => {
    const { tools } = setup(fakeClock(new Date(Number.NaN)));

    expect(await tools.get_time.execute({})).toEqual(unavailable);
  });

  it("reads the clock once per execution", async () => {
    const clock = fakeClock(new Date(2024, 0, 15, 9, 30));
    const { tools } = setup(clock);

    await tools.get_time.execute({});
    expect(clock.reads).toBe(1);

    await tools.get_time.execute({});
    expect(clock.reads).toBe(2);
  });

  it("emits no events and invokes no other tool", async () => {
    const { tools, calls, bus } = setup(fakeClock(new Date(2024, 0, 15, 9, 30)));

    await tools.get_time.execute({});

    expect(bus.events).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("leaves every other tool unchanged", () => {
    const { tools, stub } = setup(fakeClock(new Date()));
    const otherNames = toolNames.filter((name) => name !== "get_time");

    for (const name of otherNames) expect(tools[name]).toBe(stub.tools[name]);
    expect(tools.get_time).not.toBe(stub.tools.get_time);
  });

  it("ignores extra input fields", async () => {
    const { tools } = setup(fakeClock(new Date(2024, 0, 15, 14, 5)));

    const plain = await tools.get_time.execute({});
    const extra = await tools.get_time.execute({ hour: 3, zone: "UTC" });

    expect(extra).toEqual(plain);
  });
});
