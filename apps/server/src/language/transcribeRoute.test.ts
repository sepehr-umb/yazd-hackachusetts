import type { AssistantEvent } from "@mahmood/contracts";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { createEventHub } from "../events/eventHub";
import { replayConversations } from "../llm/replayConversations";
import { createTranscriptReplayLlmClient } from "../llm/transcriptReplayLlmClient";
import { createOrchestrator, createStubTools } from "../orchestrator";
import { createServer } from "../server";
import { createStubStt } from "../stt/stubStt";
import type { Stt } from "../stt/stt";
import { createStubTranslator } from "../translation/stubTranslator";
import { createStubTts } from "../tts/stubTts";
import { createTranscriber } from "./transcriber";
import type { Transcriber } from "./transcriber";

const openServers: FastifyInstance[] = [];

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((app) => app.close()));
});

function setup(transcriber?: Transcriber) {
  const hub = createEventHub();
  const events: AssistantEvent[] = [];
  hub.subscribe((event) => events.push(event));
  const stub = createStubTools();
  const app = createServer({
    orchestrator: createOrchestrator({
      llm: createTranscriptReplayLlmClient(replayConversations),
      tools: stub.tools,
      bus: hub,
    }),
    hub,
    stt: createStubStt(),
    tts: createStubTts(),
    translator: createStubTranslator(),
    transcriber,
  });
  openServers.push(app);
  const post = (payload: Buffer | string, extraHeaders: Record<string, string> = {}) =>
    app.inject({
      method: "POST",
      url: "/transcribe",
      headers: { "content-type": "audio/webm", ...extraHeaders },
      payload,
    });
  return { post, events, calls: stub.calls };
}

const fakeStt = (text: string) => {
  const heard: string[] = [];
  const hints: Array<string | undefined> = [];
  const stt: Stt = {
    async transcribe(recording, options) {
      heard.push(recording.mimeType);
      hints.push(options?.language);
      return text;
    },
  };
  return { stt, heard, hints };
};

const neverAsked = { detect: async () => undefined };

describe("POST /transcribe", () => {
  it("returns the text and the detected language, without running the orchestrator or emitting events", async () => {
    const { stt, heard } = fakeStt("Ciao!");
    const { post, events, calls } = setup(createTranscriber(stt, neverAsked));

    const response = await post(Buffer.from("voice"));

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ text: "Ciao!", language: "it" });
    expect(heard).toEqual(["audio/webm"]);
    expect(events).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("answers an empty text and no language on stubs, so the client falls back", async () => {
    const { post } = setup();

    const response = await post(Buffer.from("voice"));

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ text: "" });
  });

  it("rejects an empty recording like /audio does", async () => {
    const { post } = setup();

    const response = await post(Buffer.alloc(0));

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "The recording was empty" });
  });

  it("reports a failed transcription as a bad gateway", async () => {
    const failing: Stt = {
      transcribe: async () => {
        throw new Error("timeout");
      },
    };
    const { post } = setup(createTranscriber(failing, neverAsked));

    const response = await post(Buffer.from("voice"));

    expect(response.statusCode).toBe(502);
    expect(response.json().error).toContain("timeout");
  });

  it("passes the preferred language from x-yazd-language to speech-to-text as a hint", async () => {
    const { stt, hints } = fakeStt("ciao");
    const { post } = setup(createTranscriber(stt, neverAsked));

    await post(Buffer.from("voice"), { "x-yazd-language": "it" });
    await post(Buffer.from("voice"), { "x-yazd-language": "not a language" });
    await post(Buffer.from("voice"));

    expect(hints).toEqual(["it", undefined, undefined]);
  });
});
