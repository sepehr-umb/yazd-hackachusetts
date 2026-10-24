import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app";

type ChatBody = {
  messages: Array<{ role: string; content: string | null }>;
  tools?: Array<{ function: { name: string } }>;
};

const env = {
  OPENROUTER_API_KEY: "sk-test",
  LLM_MODEL: "test/model",
  STT_MODEL: "test/stt",
  TTS_MODEL: "test/tts",
  TTS_VOICE: "test-voice",
};

const openApps: FastifyInstance[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2024, 0, 3, 14, 35, 10));
});

afterEach(async () => {
  vi.useRealTimers();
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

function scriptedFetch(toolResults: string[]): typeof fetch {
  return async (input, init) => {
    if (String(input).endsWith("/audio/speech")) {
      return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "audio/mpeg" } });
    }
    const body = JSON.parse(String(init?.body)) as ChatBody;
    const names = body.tools?.map((tool) => tool.function.name) ?? [];
    if (names.includes("route_to_agent")) return toolCall("route_to_agent", { agent: "clock" });
    if (names.length === 0) return completion({ content: "ok" });
    const result = body.messages.find((message) => message.role === "tool");
    if (result) {
      toolResults.push(String(result.content));
      return completion({ content: "done" });
    }
    return toolCall("get_time", {});
  };
}

describe("withClock composed in createApp", () => {
  it("answers get_time from the system clock instead of the stub", async () => {
    const toolResults: string[] = [];
    const app = createApp(env, { fetch: scriptedFetch(toolResults) });
    openApps.push(app);

    await app.inject({ method: "POST", url: "/request", payload: { text: "what time is it" } });

    await vi.waitFor(() => expect(toolResults).toHaveLength(1));
    expect(JSON.parse(toolResults[0] as string)).toEqual({
      applied: true,
      hour: 14,
      minute: 35,
      weekday: "Wednesday",
    });
  });
});
