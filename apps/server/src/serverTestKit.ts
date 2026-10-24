import type { FastifyInstance } from "fastify";
import type { Clock } from "./clock/clock";
import { createEventHub } from "./events/eventHub";
import { createServer } from "./server";
import type { ServerDeps } from "./server";
import { createStubStt } from "./stt/stubStt";
import { createStubTranslator } from "./translation/stubTranslator";
import { createStubTts } from "./tts/stubTts";

export type FakeClock = Clock & { advance(ms: number): void };

export function createFakeClock(): FakeClock {
  let time = Date.UTC(2026, 0, 1);
  return {
    now: () => new Date(time),
    advance: (ms) => {
      time += ms;
    },
  };
}

export function buildServer(
  deps: Pick<ServerDeps, "orchestrator"> & Partial<ServerDeps>,
  openServers: FastifyInstance[],
) {
  const hub = deps.hub ?? createEventHub();
  const app = createServer({
    hub,
    stt: createStubStt(),
    tts: createStubTts(),
    translator: createStubTranslator(),
    ...deps,
  });
  openServers.push(app);
  return { app, hub };
}
