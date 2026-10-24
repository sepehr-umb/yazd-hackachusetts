import type { AddressInfo } from "node:net";
import type { AssistantEvent } from "@mahmood/contracts";
import { isAssistantEvent } from "@mahmood/contracts";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app";

const openApps: FastifyInstance[] = [];
const openSockets: WebSocket[] = [];

afterEach(async () => {
  for (const socket of openSockets.splice(0)) socket.close();
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

async function requestEvents(text: string) {
  const app = createApp({});
  openApps.push(app);
  await app.listen({ port: 0, host: "127.0.0.1" });
  const { port } = app.server.address() as AddressInfo;
  const socket = new WebSocket(`ws://127.0.0.1:${port}/events`);
  openSockets.push(socket);
  const events: AssistantEvent[] = [];
  socket.addEventListener("message", (message) => {
    const parsed: unknown = JSON.parse(String(message.data));
    if (isAssistantEvent(parsed)) events.push(parsed);
  });
  await new Promise<void>((resolve) => socket.addEventListener("open", () => resolve()));
  await fetch(`http://127.0.0.1:${port}/request`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const deadline = Date.now() + 2000;
  while (!events.some((event) => event.type === "speech") && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  return events;
}

describe("settings without an API key", () => {
  it("turns the Farsi speak slower request into a lower speech rate", async () => {
    const events = await requestEvents("آهسته‌تر صحبت کن");

    const change = events.find((event) => event.type === "setting_changed");
    expect(change).toMatchObject({ name: "speechRate" });
    expect((change as { value: number }).value).toBeLessThan(1);
  });

  it("turns the Farsi go back to normal request into a settings reset", async () => {
    const events = await requestEvents("برگرد به حالت عادی");

    expect(events).toContainEqual({ type: "settings_reset" });
  });
});
