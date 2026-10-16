import { fixtureContacts } from "@mahmood/contacts";
import type { FastifyInstance } from "fastify";
import { withContactResolution } from "./contacts/withContactResolution";
import { createEventHub } from "./events/eventHub";
import { selectLlmClient } from "./llm/selectLlmClient";
import type { Env, LlmClientOptions } from "./llm/selectLlmClient";
import { createOrchestrator, createStubTools } from "./orchestrator";
import { createServer } from "./server";

export type AppOptions = LlmClientOptions & { idleAfterMs?: number };

export function createApp(env: Env, options: AppOptions = {}): FastifyInstance {
  const hub = createEventHub();
  const orchestrator = createOrchestrator({
    llm: selectLlmClient(env, options),
    tools: withContactResolution(createStubTools().tools, fixtureContacts),
    bus: hub,
  });
  return createServer({ orchestrator, hub, idleAfterMs: options.idleAfterMs });
}
