import Fastify from "fastify";
import { WebSocketServer } from "ws";
import type { FastifyInstance } from "fastify";
import type { EventHub } from "./events/eventHub";
import type { Orchestrator } from "./orchestrator";

export type ServerDeps = {
  orchestrator: Orchestrator;
  hub: EventHub;
  idleAfterMs?: number;
};

function readText(body: unknown): string | undefined {
  const text = (body as { text?: unknown } | null)?.text;
  return typeof text === "string" && text.trim() !== "" ? text.trim() : undefined;
}

export function createServer({ orchestrator, hub, idleAfterMs }: ServerDeps): FastifyInstance {
  const app = Fastify();
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

  app.post("/request", async (request, reply) => {
    const text = readText(request.body);
    if (text === undefined) {
      return reply.code(400).send({ error: 'Body must be { "text": a non-empty string }' });
    }
    hub.emit({ type: "transcript", text });
    const result = await orchestrator.handle(text);
    if (idleAfterMs !== undefined) {
      idleTimer = setTimeout(() => hub.emit({ type: "state", state: "idle" }), idleAfterMs);
    }
    return result;
  });

  return app;
}
