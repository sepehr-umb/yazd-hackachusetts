import type { AddressInfo } from "node:net";
import type { AssistantEvent } from "@mahmood/contracts";
import { isAssistantEvent } from "@mahmood/contracts";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app";

type ChatBody = { tools?: Array<{ function: { name: string } }> };

const env = {
  OPENROUTER_API_KEY: "sk-test",
  LLM_MODEL: "test/model",
  STT_MODEL: "test/stt",
  TTS_MODEL: "test/tts",
  TTS_VOICE: "test-voice",
};

const pcmBytes = new Uint8Array([1, 2, 3, 4]);

const openApps: FastifyInstance[] = [];
const openSockets: WebSocket[] = [];

afterEach(async () => {
  for (const socket of openSockets.splice(0)) socket.close();
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

function completion(message: object) {
  return Response.json({ choices: [{ message: { role: "assistant", ...message } }] });
}

function pcmFetch(speechBodies: Array<Record<string, unknown>>): typeof fetch {
  return async (input, init) => {
    if (String(input).endsWith("/audio/speech")) {
      speechBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(pcmBytes, { headers: { "content-type": "audio/pcm" } });
    }
    const body = JSON.parse(String(init?.body)) as ChatBody;
    const names = body.tools?.map((tool) => tool.function.name) ?? [];
    if (names.length === 0) return completion({ content: "ok" });
    return completion({
      content: null,
      tool_calls: [
        {
          id: "call-route",
          type: "function",
          function: { name: "route_to_agent", arguments: JSON.stringify({ agent: "clarifier" }) },
        },
      ],
    });
  };
}

async function collectEvents(port: number) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/events`);
  openSockets.push(socket);
  const events: AssistantEvent[] = [];
  socket.addEventListener("message", (message) => {
    const parsed: unknown = JSON.parse(String(message.data));
    if (isAssistantEvent(parsed)) events.push(parsed);
  });
  await new Promise<void>((resolve) => socket.addEventListener("open", () => resolve()));
  return events;
}

describe("TTS_FORMAT wired through createApp", () => {
  it("serves WAV audio and publishes the speech event when TTS_FORMAT is pcm", async () => {
    const speechBodies: Array<Record<string, unknown>> = [];
    const app = createApp({ ...env, TTS_FORMAT: "pcm" }, { fetch: pcmFetch(speechBodies) });
    openApps.push(app);
    await app.listen({ port: 0, host: "127.0.0.1" });
    const { port } = app.server.address() as AddressInfo;
    const events = await collectEvents(port);

    await fetch(`http://127.0.0.1:${port}/request`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "hello" }),
    });

    const deadline = Date.now() + 2000;
    while (!events.some((event) => event.type === "speech") && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const speech = events.find((event) => event.type === "speech");
    expect(speech).toBeDefined();
    expect(speechBodies[0]?.response_format).toBe("pcm");
    const audioUrl = (speech as { audioUrl: string }).audioUrl;
    const audio = await app.inject({ method: "GET", url: audioUrl });
    expect(audio.headers["content-type"]).toContain("audio/wav");
    expect(audio.rawPayload.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(audio.rawPayload.length).toBe(44 + pcmBytes.length);
  });

  it("fails at startup when TTS_FORMAT is invalid and a key is set", () => {
    expect(() => createApp({ ...env, TTS_FORMAT: "wav" })).toThrow("TTS_FORMAT must be mp3 or pcm");
  });
});
