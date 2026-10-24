import { fixtureContacts } from "@mahmood/contacts";
import type { FastifyInstance } from "fastify";
import { withContactResolution } from "./contacts/withContactResolution";
import { createEventHub } from "./events/eventHub";
import { selectLlmClient } from "./llm/selectLlmClient";
import type { Env, LlmClientOptions } from "./llm/selectLlmClient";
import { createOrchestrator, createStubTools } from "./orchestrator";
import { createServer } from "./server";
import { selectStt } from "./stt/selectStt";
import { selectTts } from "./tts/selectTts";

export type AppOptions = LlmClientOptions & { idleAfterMs?: number };

export function createApp(env: Env, options: AppOptions = {}): FastifyInstance {
  const hub = createEventHub();
  const orchestrator = createOrchestrator({
    llm: selectLlmClient(env, options),
    tools: withContactResolution(createStubTools().tools, fixtureContacts),
    bus: hub,
  });
  return createServer({
    orchestrator,
    hub,
    stt: selectStt(env, options),
    tts: selectTts(env, options),
    idleAfterMs: options.idleAfterMs,
  });
}
