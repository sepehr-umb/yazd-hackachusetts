import type { AddressInfo } from "node:net";
import type { AssistantEvent } from "@mahmood/contracts";
import { isAssistantEvent } from "@mahmood/contracts";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app";

type ChatBody = {
  messages: Array<{ role: string }>;
  tools?: Array<{ function: { name: string } }>;
};

const env = {
  OPENROUTER_API_KEY: "sk-test",
  LLM_MODEL: "test/model",
  STT_MODEL: "test/stt",
  TTS_MODEL: "test/tts",
};

const openApps: FastifyInstance[] = [];
const openSockets: WebSocket[] = [];

afterEach(async () => {
  for (const socket of openSockets.splice(0)) socket.close();
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

function completion(message: object) {
  return Response.json({ choices: [{ message: { role: "assistant", ...message } }] });
}

function toolCall(name: string, args: object) {
  return completion({
    content: null,
    tool_calls: [
      { id: `call-${name}`, type: "function", function: { name, arguments: JSON.stringify(args) } },
    ],
  });
}

function scriptedFetch(settingsCall: { name: string; args: object }): typeof fetch {
  return async (input, init) => {
    if (String(input).endsWith("/audio/speech")) {
      return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "audio/mpeg" } });
    }
    const body = JSON.parse(String(init?.body)) as ChatBody;
    const toolNames = body.tools?.map((tool) => tool.function.name) ?? [];
    if (toolNames.includes("route_to_agent"))
      return toolCall("route_to_agent", { agent: "settings" });
    if (toolNames.length === 0) return completion({ content: "ok" });
    if (body.messages.some((message) => message.role === "tool")) {
      return completion({ content: "done" });
    }
    return toolCall(settingsCall.name, settingsCall.args);
  };
}

async function runRequest(settingsCall: { name: string; args: object }) {
  const app = createApp(env, { fetch: scriptedFetch(settingsCall) });
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
    body: JSON.stringify({ text: "settings request" }),
  });
  const deadline = Date.now() + 2000;
  while (!events.some((event) => event.type === "speech") && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  return events;
}

describe("withSettings composed in createApp", () => {
  it("broadcasts setting_changed when the settings agent updates a setting", async () => {
    const events = await runRequest({
      name: "update_setting",
      args: { name: "speechRate", value: 0.8 },
    });

    expect(events).toContainEqual({ type: "setting_changed", name: "speechRate", value: 0.8 });
  });

  it("broadcasts settings_reset when the settings agent resets", async () => {
    const events = await runRequest({ name: "reset_settings", args: {} });

    expect(events).toContainEqual({ type: "settings_reset" });
  });
});
