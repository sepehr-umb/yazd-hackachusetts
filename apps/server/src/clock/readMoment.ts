import type { Clock } from "./clock";

export const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type TimeResult = { hour: number; minute: number; weekday: (typeof weekdays)[number] };

export function readMoment(clock: Clock): TimeResult | undefined {
  try {
    const moment = clock.now();
    if (!Number.isFinite(moment.getTime())) return undefined;
    return {
      hour: moment.getHours(),
      minute: moment.getMinutes(),
      weekday: weekdays[moment.getDay()] as TimeResult["weekday"],
    };
  } catch {
    return undefined;
  }
}
