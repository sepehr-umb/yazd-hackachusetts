import Fastify from "fastify";
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

export function createServer({ orchestrator, hub }: ServerDeps): FastifyInstance {
  const app = Fastify();

  app.post("/request", async (request, reply) => {
    const text = readText(request.body);
    if (text === undefined) {
      return reply.code(400).send({ error: 'Body must be { "text": a non-empty string }' });
    }
    hub.emit({ type: "transcript", text });
    return orchestrator.handle(text);
  });

  return app;
}
