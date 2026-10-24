import { fixtureContacts } from "@mahmood/contacts";
import type { FastifyInstance } from "fastify";
import type { Clock } from "./clock/clock";
import { withClock } from "./clock/withClock";
import { withContactResolution } from "./contacts/withContactResolution";
import { createEventHub } from "./events/eventHub";
import { selectLlmClient } from "./llm/selectLlmClient";
import type { Env, LlmClientOptions } from "./llm/selectLlmClient";
import { createOrchestrator, createStubTools } from "./orchestrator";
import { createServer } from "./server";
import { withSettings } from "./settings/withSettings";
import { selectStt } from "./stt/selectStt";
import { selectTranslator } from "./translation/selectTranslator";
import { selectTts } from "./tts/selectTts";

export type AppOptions = LlmClientOptions & { idleAfterMs?: number };

export function createApp(env: Env, options: AppOptions = {}): FastifyInstance {
  const hub = createEventHub();
  const clock: Clock = { now: () => new Date() };
  const orchestrator = createOrchestrator({
    llm: selectLlmClient(env, options),
    tools: withClock(
      withSettings(withContactResolution(createStubTools().tools, fixtureContacts), hub),
      clock,
    ),
    bus: hub,
  });
  return createServer({
    orchestrator,
    hub,
    stt: selectStt(env, options),
    tts: selectTts(env, options),
    translator: selectTranslator(env, options),
    idleAfterMs: options.idleAfterMs,
  });
}
