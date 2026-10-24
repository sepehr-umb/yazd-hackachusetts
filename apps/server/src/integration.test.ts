import type { AddressInfo } from "node:net";
import type { AssistantEvent } from "@mahmood/contracts";
import { isAssistantEvent } from "@mahmood/contracts";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app";

const openApps: FastifyInstance[] = [];
const openSockets: WebSocket[] = [];

afterEach(async () => {
  for (const socket of openSockets.splice(0)) socket.close();
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

async function startApp() {
  const app = createApp({});
  openApps.push(app);
  await app.listen({ port: 0, host: "127.0.0.1" });
  const { port } = app.server.address() as AddressInfo;
  return { port };
}

async function connectToEvents(port: number) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/events`);
  openSockets.push(socket);
  const events: AssistantEvent[] = [];
  socket.addEventListener("message", (message) => {
    const parsed: unknown = JSON.parse(String(message.data));
    if (isAssistantEvent(parsed)) events.push(parsed);
  });
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve());
    socket.addEventListener("error", () => reject(new Error("WebSocket failed to connect")));
  });
  const until = async (done: (events: AssistantEvent[]) => boolean) => {
    const deadline = Date.now() + 2000;
    while (!done(events)) {
      if (Date.now() > deadline)
        throw new Error(`Timed out waiting; got ${JSON.stringify(events)}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    return events;
  };
  return { events, until };
}

function postRequest(port: number, text: string) {
  return fetch(`http://127.0.0.1:${port}/request`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

const captionsOf = (events: AssistantEvent[]) => events.filter((event) => event.type === "caption");

const withoutCaptions = (events: AssistantEvent[]) =>
  events.filter((event) => event.type !== "caption");

const reachedSpeech = (events: AssistantEvent[]) =>
  events.some((event) => event.type === "speech") && captionsOf(events).length === 2;

const speechEvent = { type: "speech", audioUrl: expect.stringMatching(/^\/speech\/.+/) };

describe("typed request end to end", () => {
  it("broadcasts the event sequence of a successful call over /events", async () => {
    const { port } = await startApp();
    const { until } = await connectToEvents(port);

    const response = await postRequest(port, "به مامان زنگ بزن");
    const events = await until(reachedSpeech);

    expect(await response.json()).toEqual({
      status: "succeeded",
      agent: "comms",
      reply: "دارم به مامان زنگ می‌زنم",
    });
    expect(captionsOf(events)).toEqual([
      {
        type: "caption",
        speaker: "user",
        text: "به مامان زنگ بزن",
        english: "به مامان زنگ بزن",
      },
      {
        type: "caption",
        speaker: "assistant",
        text: "دارم به مامان زنگ می‌زنم",
        english: "دارم به مامان زنگ می‌زنم",
      },
    ]);
    expect(withoutCaptions(events)).toEqual([
      { type: "transcript", text: "به مامان زنگ بزن" },
      { type: "state", state: "thinking" },
      { type: "agent", agent: "orchestrator" },
      { type: "agent", agent: "comms" },
      { type: "tool_call", tool: "call_contact", status: "started" },
      { type: "tool_call", tool: "call_contact", status: "succeeded" },
      { type: "state", state: "speaking" },
      speechEvent,
    ]);
  });

  it("broadcasts a failed tool call and the error state when the contact is ambiguous", async () => {
    const { port } = await startApp();
    const { until } = await connectToEvents(port);

    const response = await postRequest(port, "به احمدی زنگ بزن");
    const events = await until(reachedSpeech);

    expect(await response.json()).toEqual({
      status: "failed",
      agent: "comms",
      failure: {
        reason: "tool_failed",
        tool: "call_contact",
        error: 'Several contacts match "احمدی": حسین احمدی, حسن احمدی',
      },
    });
    expect(captionsOf(events).map((event) => event.speaker)).toEqual(["user", "assistant"]);
    expect(withoutCaptions(events)).toEqual([
      { type: "transcript", text: "به احمدی زنگ بزن" },
      { type: "state", state: "thinking" },
      { type: "agent", agent: "orchestrator" },
      { type: "agent", agent: "comms" },
      { type: "tool_call", tool: "call_contact", status: "started" },
      { type: "tool_call", tool: "call_contact", status: "failed" },
      { type: "state", state: "error" },
      speechEvent,
    ]);
  });
});
