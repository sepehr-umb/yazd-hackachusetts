import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import type { EventHub } from "./events/eventHub";
import type { Orchestrator } from "./orchestrator";

export type ServerDeps = {
  orchestrator: Orchestrator;
  hub: EventHub;
  idleAfterMs?: number;
};

export function createServer({ orchestrator }: ServerDeps): FastifyInstance {
  const app = Fastify();

  app.post("/request", async (request) => {
    const { text } = request.body as { text: string };
    return orchestrator.handle(text);
  });

  return app;
}
