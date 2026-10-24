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

describe("clock without an API key", () => {
  it("routes the Farsi time question to the clock agent and speaks the answer", async () => {
    const events = await requestEvents("ساعت چنده؟");

    expect(events).toContainEqual({ type: "agent", agent: "clock" });
    expect(events.some((event) => event.type === "speech")).toBe(true);
  });
});
