import type { AddressInfo } from "node:net";
import { isAssistantEvent, toolNames } from "@mahmood/contracts";
import type { AssistantEvent } from "@mahmood/contracts";
import { friendlyApology } from "@mahmood/strings";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app";

const openApps: FastifyInstance[] = [];
const openSockets: WebSocket[] = [];
const unknownRequest = "chiama mamma";
const expected = friendlyApology({ reason: "llm_error", message: "" }, unknownRequest);

afterEach(async () => {
  vi.restoreAllMocks();
  for (const socket of openSockets.splice(0)) socket.close();
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

async function requestEvents(app: FastifyInstance, text: string) {
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

function assistantCaption(events: AssistantEvent[]) {
  return events.find((event) => event.type === "caption" && event.speaker === "assistant");
}

describe("friendly failure through createApp", () => {
  it("captions and speaks the table apology with no key and no network call", async () => {
    const network = vi.spyOn(globalThis, "fetch");

    const events = await requestEvents(createApp({}), unknownRequest);

    const caption = assistantCaption(events);
    expect(caption?.type === "caption" ? caption.text : "").toBe(expected);
    expect(events.some((event) => event.type === "speech")).toBe(true);
    const calledNetwork = network.mock.calls.filter(([url]) => !String(url).includes("127.0.0.1"));
    expect(calledNetwork).toEqual([]);
    for (const name of toolNames) expect(expected).not.toContain(name);
  });

  it("sends the same apology to speech synthesis", async () => {
    const spoken: string[] = [];
    const systemPrompts: string[] = [];
    const scripted: typeof fetch = async (input, init) => {
      if (String(input).endsWith("/audio/speech")) {
        spoken.push((JSON.parse(String(init?.body)) as { input: string }).input);
        return new Response(new Uint8Array([1]), { headers: { "content-type": "audio/mpeg" } });
      }
      const body = JSON.parse(String(init?.body)) as {
        messages: Array<{ role: string; content: string }>;
      };
      const system = body.messages.find((message) => message.role === "system");
      systemPrompts.push(system?.content ?? "");
      return new Response("down", { status: 500 });
    };
    const env = {
      OPENROUTER_API_KEY: "sk-test",
      LLM_MODEL: "test/model",
      STT_MODEL: "test/stt",
      TTS_MODEL: "test/tts",
      TTS_VOICE: "test-voice",
    };

    await requestEvents(createApp(env, { fetch: scripted }), unknownRequest);

    expect(spoken).toEqual([expected]);
    const apologyAsks = systemPrompts.filter(
      (prompt) => !prompt.startsWith("Translate") && !prompt.startsWith("You route"),
    );
    expect(apologyAsks).toHaveLength(1);
  });
});
