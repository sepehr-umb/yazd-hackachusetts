import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fixtureContacts } from "@mahmood/contacts";
import type { FastifyInstance } from "fastify";
import type { Clock } from "./clock/clock";
import { withClock } from "./clock/withClock";
import { withContactResolution } from "./contacts/withContactResolution";
import { loadLocalContacts } from "./device/localContacts";
import { withDeviceActions } from "./device/withDeviceActions";
import { createEventHub } from "./events/eventHub";
import { selectGoveeLight } from "./home/goveeLight";
import { selectLlmClient } from "./llm/selectLlmClient";
import type { Env, LlmClientOptions } from "./llm/selectLlmClient";
import { createOrchestrator, createStubTools } from "./orchestrator";
import { createServer } from "./server";
import { withSettings } from "./settings/withSettings";
import { selectStt } from "./stt/selectStt";
import { selectTranslator } from "./translation/selectTranslator";
import { selectTts } from "./tts/selectTts";

export type AppOptions = LlmClientOptions & { idleAfterMs?: number; staticDir?: string };

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

const readFromRoot = (path: string) => readFileSync(resolve(repoRoot, path), "utf8");

export function createApp(env: Env, options: AppOptions = {}): FastifyInstance {
  const hub = createEventHub();
  const localContacts = loadLocalContacts(env, readFromRoot);
  const contacts = localContacts ?? fixtureContacts;
  const stubs = createStubTools().tools;
  const comms = localContacts ? withDeviceActions(stubs, localContacts, hub) : stubs;
  const light = selectGoveeLight(env, options.fetch);
  const devices = light ? { ...comms, set_light: light } : comms;
  const clock: Clock = { now: () => new Date() };
  const llm = selectLlmClient(env, options);
  const orchestrator = createOrchestrator({
    llm,
    tools: withClock(withSettings(withContactResolution(devices, contacts), hub), clock),
    bus: hub,
  });
  const staticDir =
    options.staticDir !== undefined && existsSync(options.staticDir)
      ? options.staticDir
      : undefined;
  return createServer({
    orchestrator,
    hub,
    apologyLlm: llm,
    stt: selectStt(env, options),
    tts: selectTts(env, options),
    translator: selectTranslator(env, options),
    idleAfterMs: options.idleAfterMs,
    staticDir,
    clock,
  });
}
