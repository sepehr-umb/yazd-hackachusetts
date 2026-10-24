import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import type { Orchestrator } from "./orchestrator";
import { buildServer } from "./serverTestKit";
import type { Stt } from "./stt/stt";

const openServers: FastifyInstance[] = [];
const reply = { status: "succeeded", agent: "comms", reply: "ok" } as const;

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((app) => app.close()));
});

const orchestrator: Orchestrator = { handle: async () => reply };

describe("POST /audio language", () => {
  function sttSpy() {
    const seen: Array<{ language?: string } | undefined> = [];
    const stt: Stt = {
      transcribe: async (_recording, options) => {
        seen.push(options);
        return "سلام";
      },
    };
    return { stt, seen };
  }

  function postAudio(app: FastifyInstance, headers: Record<string, string>) {
    return app.inject({
      method: "POST",
      url: "/audio",
      headers: { "content-type": "audio/webm", ...headers },
      payload: Buffer.from([1, 2, 3]),
    });
  }

  it("hands the x-yazd-language header to the Stt as { language }", async () => {
    const { stt, seen } = sttSpy();
    const { app } = buildServer({ orchestrator, stt }, openServers);

    const response = await postAudio(app, { "x-yazd-language": "fa" });

    expect(response.statusCode).toBe(200);
    expect(seen).toEqual([{ language: "fa" }]);
  });

  it("drops an invalid header and still answers 200", async () => {
    const { stt, seen } = sttSpy();
    const { app } = buildServer({ orchestrator, stt }, openServers);

    const response = await postAudio(app, { "x-yazd-language": "Persian" });

    expect(response.statusCode).toBe(200);
    expect(seen[0]?.language).toBeUndefined();
  });

  it("keeps the response shape with no header", async () => {
    const { stt } = sttSpy();
    const { app } = buildServer({ orchestrator, stt }, openServers);

    const response = await postAudio(app, {});

    expect(response.json()).toEqual({ status: "succeeded", agent: "comms", reply: "ok" });
  });
});
