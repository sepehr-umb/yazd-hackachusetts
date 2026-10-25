import { mkdtempSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isAssistantEvent } from "@mahmood/contracts";
import type { AssistantEvent } from "@mahmood/contracts";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app";

const openApps: FastifyInstance[] = [];
const openSockets: WebSocket[] = [];

afterEach(async () => {
  for (const socket of openSockets.splice(0)) socket.close();
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

function contactsFile(): string {
  const path = join(mkdtempSync(join(tmpdir(), "yazd-")), "contacts.json");
  writeFileSync(path, JSON.stringify([{ name: "فاطمه", aliases: ["مامان"], phone: "+16175550100" }]));
  return path;
}

async function requestEvents(env: Record<string, string>, text: string) {
  const app = createApp(env);
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

describe("device actions through createApp", () => {
  it("emits a WhatsApp call with the saved number when CONTACTS_FILE is set", async () => {
    const events = await requestEvents({ CONTACTS_FILE: contactsFile() }, "به مامان زنگ بزن");

    expect(events).toContainEqual({
      type: "device_action",
      action: "whatsapp_call",
      contact: "فاطمه",
      phone: "+16175550100",
    });
  });

  it("emits no device action without CONTACTS_FILE", async () => {
    const events = await requestEvents({}, "به مامان زنگ بزن");

    expect(events.some((event) => event.type === "device_action")).toBe(false);
  });
});
