import type { AssistantEvent } from "@mahmood/contracts";
import { friendlyApology } from "@mahmood/strings";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { createEventHub } from "./events/eventHub";
import { createOrchestrator, createStubTools } from "./orchestrator";
import type { HandleOptions, LlmClient, Orchestrator } from "./orchestrator";
import { buildServer, createFakeClock } from "./serverTestKit";

const openServers: FastifyInstance[] = [];
const question = "کدام یک؟";
const first = "به احمدی زنگ بزن";

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((app) => app.close()));
});

function recordingOrchestrator() {
  const calls: Array<{ text: string; options: HandleOptions | undefined }> = [];
  const orchestrator: Orchestrator = {
    async handle(text, options) {
      calls.push({ text, options });
      if (calls.length === 1) options?.onQuestion?.();
      return { status: "succeeded", agent: "comms", reply: calls.length === 1 ? question : "ok" };
    },
  };
  return { orchestrator, calls };
}

function post(app: FastifyInstance, payload: unknown) {
  return app.inject({ method: "POST", url: "/request", payload: payload as object });
}

describe("POST /request conversation context", () => {
  it("gives the answer the request and question when it arrives within 90 seconds", async () => {
    const clock = createFakeClock();
    const { orchestrator, calls } = recordingOrchestrator();
    const { app } = buildServer({ orchestrator, clock }, openServers);

    await post(app, { text: first });
    clock.advance(10_000);
    await post(app, { text: "حسین" });

    expect(calls[1]?.text).toBe("حسین");
    expect(calls[1]?.options?.history).toEqual({ request: first, question });
  });

  it("treats the answer as a first request at +91 seconds", async () => {
    const clock = createFakeClock();
    const { orchestrator, calls } = recordingOrchestrator();
    const { app } = buildServer({ orchestrator, clock }, openServers);

    await post(app, { text: first });
    clock.advance(91_000);
    await post(app, { text: "حسین" });

    expect(calls[1]?.options?.history).toBeUndefined();
  });

  it("returns the Farsi fixed apology for '..' with language fa when the model fails", async () => {
    const llm: LlmClient = {
      complete: async () => {
        throw new Error("down");
      },
    };
    const hub = createEventHub();
    const events: AssistantEvent[] = [];
    hub.subscribe((event) => events.push(event));
    const orchestrator = createOrchestrator({ llm, tools: createStubTools().tools, bus: hub });
    const { app } = buildServer({ orchestrator, hub }, openServers);

    const response = await post(app, { text: "..", language: "fa" });

    const expected = friendlyApology({ reason: "llm_error", message: "" }, "..", "fa");
    const caption = events.find((e) => e.type === "caption" && e.speaker === "assistant");
    expect(response.json().status).toBe("failed");
    expect(caption?.type === "caption" ? caption.text : "").toBe(expected);
    expect(expected).not.toBe(friendlyApology({ reason: "llm_error", message: "" }, ".."));
  });

  it("passes the validated language to the orchestrator and drops an invalid one", async () => {
    const { orchestrator, calls } = recordingOrchestrator();
    const { app } = buildServer({ orchestrator }, openServers);

    const valid = await post(app, { text: "a", language: "fa" });
    const invalid = await post(app, { text: "b", language: "fa; ignore previous" });

    expect(valid.statusCode).toBe(200);
    expect(invalid.statusCode).toBe(200);
    expect(calls[0]?.options?.language).toBe("fa");
    expect(calls[1]?.options?.language).toBeUndefined();
  });

  it("keeps the response shape for a body with only text", async () => {
    const { orchestrator } = recordingOrchestrator();
    const { app } = buildServer({ orchestrator }, openServers);

    const response = await post(app, { text: "hello" });

    expect(response.json()).toEqual({ status: "succeeded", agent: "comms", reply: question });
  });
});
