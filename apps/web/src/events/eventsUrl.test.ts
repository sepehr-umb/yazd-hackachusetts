import { describe, expect, it } from "vitest";
import { eventsUrl } from "./eventsUrl";

describe("eventsUrl", () => {
  it.each([
    [{ protocol: "http:", host: "localhost:5173" }, "ws://localhost:5173/events"],
    [{ protocol: "https:", host: "yazd.example.com" }, "wss://yazd.example.com/events"],
  ])("maps %j to %s", (location, expected) => {
    expect(eventsUrl(location)).toBe(expected);
  });
});
