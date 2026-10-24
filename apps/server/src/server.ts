import { strings } from "@mahmood/strings";
import Fastify from "fastify";
import { WebSocketServer } from "ws";
import type { FastifyInstance } from "fastify";
import type { EventHub } from "./events/eventHub";
import type { Orchestrator } from "./orchestrator";
import { createSpeaker } from "./speech/speaker";
import { spokenText } from "./speech/spokenText";
import { createSpeechStore } from "./speech/speechStore";
import type { SpeechStore } from "./speech/speechStore";
import type { Stt } from "./stt/stt";
import { createCaptioner } from "./translation/captioner";
import type { Translator } from "./translation/translator";
import type { Tts } from "./tts/tts";
import { registerStaticSite } from "./web/staticSite";

export type ServerDeps = {
  orchestrator: Orchestrator;
  hub: EventHub;
  stt: Stt;
  tts: Tts;
  translator: Translator;
  speech?: SpeechStore;
  idleAfterMs?: number;
  staticDir?: string;
};

const MAX_RECORDING_BYTES = 10 * 1024 * 1024;

function readText(body: unknown): string | undefined {
  const text = (body as { text?: unknown } | null)?.text;
  return typeof text === "string" && text.trim() !== "" ? text.trim() : undefined;
}

export function createServer({
  orchestrator,
  hub,
  stt,
  tts,
  translator,
  speech = createSpeechStore(),
  idleAfterMs,
  staticDir,
}: ServerDeps): FastifyInstance {
  const app = Fastify();
  const speaker = createSpeaker({ tts, store: speech, bus: hub });
  const captioner = createCaptioner({ translator, bus: hub });
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const sockets = new WebSocketServer({ server: app.server, path: "/events" });

  sockets.on("connection", (socket) => {
    const unsubscribe = hub.subscribe((event) => socket.send(JSON.stringify(event)));
    socket.on("close", unsubscribe);
  });

  app.addHook("onClose", async () => {
    clearTimeout(idleTimer);
    for (const socket of sockets.clients) socket.terminate();
    await new Promise<void>((resolve) => sockets.close(() => resolve()));
  });

  app.addContentTypeParser(
    /^audio\//,
    { parseAs: "buffer", bodyLimit: MAX_RECORDING_BYTES },
    (_request, body, done) => done(null, body),
  );

  const runPipeline = async (text: string) => {
    clearTimeout(idleTimer);
    hub.emit({ type: "transcript", text });
    const [, result] = await Promise.all([
      captioner.announce("user", text),
      orchestrator.handle(text),
    ]);
    await Promise.all([
      captioner.announce("assistant", spokenText(result)),
      speaker.speak(result).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Speech failed:", message);
      }),
    ]);
    clearTimeout(idleTimer);
    if (idleAfterMs !== undefined) {
      idleTimer = setTimeout(() => hub.emit({ type: "state", state: "idle" }), idleAfterMs);
    }
    return result;
  };

  app.post("/request", async (request, reply) => {
    const text = readText(request.body);
    if (text === undefined) {
      return reply.code(400).send({ error: 'Body must be { "text": a non-empty string }' });
    }
    return runPipeline(text);
  });

  app.post("/audio", async (request, reply) => {
    const data = request.body;
    if (!Buffer.isBuffer(data) || data.length === 0) {
      return reply.code(400).send({ error: strings.audio.emptyRecording });
    }
    let text: string;
    try {
      text = (
        await stt.transcribe({ data, mimeType: request.headers["content-type"] ?? "" })
      ).trim();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return reply.code(502).send({ error: strings.audio.transcriptionFailed(message) });
    }
    if (text === "") return reply.code(422).send({ error: strings.audio.nothingHeard });
    return runPipeline(text);
  });

  app.get<{ Params: { id: string } }>("/speech/:id", async (request, reply) => {
    const audio = speech.get(request.params.id);
    if (!audio) return reply.code(404).send();
    return reply.type(audio.mimeType).send(audio.data);
  });

  if (staticDir !== undefined) registerStaticSite(app, staticDir);

  return app;
}
