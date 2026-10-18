import type { AssistantEvent } from "@mahmood/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { createEventHub } from "./events/eventHub";
import { replayConversations } from "./llm/replayConversations";
import { createTranscriptReplayLlmClient } from "./llm/transcriptReplayLlmClient";
import { createOrchestrator, createStubTools } from "./orchestrator";
import { createServer } from "./server";
import { createSpeechStore } from "./speech/speechStore";
import type { SpeechAudio } from "./speech/speechStore";
import { createStubStt } from "./stt/stubStt";
import type { Stt } from "./stt/stt";
import { createStubTts } from "./tts/stubTts";
import type { Tts } from "./tts/tts";

const openServers: FastifyInstance[] = [];

type SetupOptions = { idleAfterMs?: number; stt?: Stt; tts?: Tts; now?: () => number };

function setup(options: SetupOptions = {}) {
  const hub = createEventHub();
  const stub = createStubTools();
  const orchestrator = createOrchestrator({
    llm: createTranscriptReplayLlmClient(replayConversations),
    tools: stub.tools,
    bus: hub,
  });
  const app = createServer({
    orchestrator,
    hub,
    stt: options.stt ?? createStubStt(),
    tts: options.tts ?? createStubTts(),
    speech: createSpeechStore({ now: options.now }),
    idleAfterMs: options.idleAfterMs,
  });
  openServers.push(app);
  return { app, hub, calls: stub.calls };
}

afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(openServers.splice(0).map((app) => app.close()));
});

describe("POST /request", () => {
  it("runs the orchestrator on the typed text and responds with its result", async () => {
    const { app, calls } = setup();

    const response = await app.inject({
      method: "POST",
      url: "/request",
      payload: { text: "به مامان زنگ بزن" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "succeeded",
      agent: "comms",
      reply: "دارم به مامان زنگ می‌زنم",
    });
    expect(calls).toEqual([{ tool: "call_contact", input: { contact: "مامان" } }]);
  });

  it("announces the typed text as a transcript event before the orchestrator starts", async () => {
    const { app, hub } = setup();
    const events: AssistantEvent[] = [];
    hub.subscribe((event) => events.push(event));

    await app.inject({ method: "POST", url: "/request", payload: { text: "به مامان زنگ بزن" } });

    expect(events.slice(0, 3)).toEqual([
      { type: "transcript", text: "به مامان زنگ بزن" },
      { type: "state", state: "thinking" },
      { type: "agent", agent: "orchestrator" },
    ]);
  });

  it.each(["{}", '{"text":42}', '{"text":""}', '{"text":"   "}', "null", '"به مامان زنگ بزن"'])(
    "rejects the JSON body %s with 400 and does not run the orchestrator",
    async (payload) => {
      const { app, hub } = setup();
      const events: AssistantEvent[] = [];
      hub.subscribe((event) => events.push(event));

      const response = await app.inject({
        method: "POST",
        url: "/request",
        payload,
        headers: { "content-type": "application/json" },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: 'Body must be { "text": a non-empty string }' });
      expect(events).toEqual([]);
    },
  );
});

describe("settling to idle", () => {
  it("emits idle once idleAfterMs has passed since the reply, and not before", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { app, hub } = setup({ idleAfterMs: 3000 });
    const states: string[] = [];
    hub.subscribe((event) => event.type === "state" && states.push(event.state));

    await app.inject({ method: "POST", url: "/request", payload: { text: "به مامان زنگ بزن" } });
    vi.advanceTimersByTime(2999);
    expect(states).toEqual(["thinking", "speaking"]);

    vi.advanceTimersByTime(1);
    expect(states).toEqual(["thinking", "speaking", "idle"]);
  });

  it("cancels a pending idle when a new request arrives", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { app, hub } = setup({ idleAfterMs: 3000 });
    const states: string[] = [];
    hub.subscribe((event) => event.type === "state" && states.push(event.state));

    await app.inject({ method: "POST", url: "/request", payload: { text: "به مامان زنگ بزن" } });
    vi.advanceTimersByTime(2000);
    await app.inject({ method: "POST", url: "/request", payload: { text: "به مامان زنگ بزن" } });
    vi.advanceTimersByTime(2999);

    expect(states).toEqual(["thinking", "speaking", "thinking", "speaking"]);
  });
});

const spokenAudio: SpeechAudio = { data: Buffer.from([4, 5, 6]), mimeType: "audio/mpeg" };

function recordingTts() {
  const spoken: string[] = [];
  const tts: Tts = {
    synthesize: async (text) => {
      spoken.push(text);
      return spokenAudio;
    },
  };
  return { tts, spoken };
}

function collect(hub: ReturnType<typeof setup>["hub"]) {
  const events: AssistantEvent[] = [];
  hub.subscribe((event) => events.push(event));
  return events;
}

function speechUrlIn(events: AssistantEvent[]) {
  const speech = events.find((event) => event.type === "speech");
  return speech?.type === "speech" ? speech.audioUrl : undefined;
}

describe("speaking results", () => {
  it("speaks the reply of a typed request and serves the audio at the URL in a speech event", async () => {
    const { tts, spoken } = recordingTts();
    const { app, hub } = setup({ tts });
    const events = collect(hub);

    await app.inject({ method: "POST", url: "/request", payload: { text: "به مامان زنگ بزن" } });

    expect(spoken).toEqual(["دارم به مامان زنگ می‌زنم"]);
    const url = speechUrlIn(events);
    expect(url).toMatch(/^\/speech\/.+/);
    const audio = await app.inject({ method: "GET", url: url ?? "" });
    expect(audio.statusCode).toBe(200);
    expect(audio.headers["content-type"]).toBe("audio/mpeg");
    expect(audio.rawPayload).toEqual(spokenAudio.data);
  });

  it("speaks the question of a clarification", async () => {
    const { tts, spoken } = recordingTts();
    const { app } = setup({ tts });
    const { question } = (
      await app.inject({ method: "POST", url: "/request", payload: { text: "روشنش کن" } })
    ).json();

    expect(spoken).toEqual([question]);
  });

  it("speaks the page's failure text when the failure has no message", async () => {
    const { tts, spoken } = recordingTts();
    const { app } = setup({ tts });

    await app.inject({ method: "POST", url: "/request", payload: { text: "هوا فردا چطور است؟" } });

    expect(spoken).toEqual(["The assistant does not know how to help with that"]);
  });

  it("still returns the result and emits no speech event when synthesis fails", async () => {
    const tts: Tts = {
      synthesize: async () => {
        throw new Error("no credits");
      },
    };
    const { app, hub } = setup({ tts });
    const events = collect(hub);

    const response = await app.inject({
      method: "POST",
      url: "/request",
      payload: { text: "به مامان زنگ بزن" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("succeeded");
    expect(speechUrlIn(events)).toBeUndefined();
  });
});

describe("GET /speech/:id", () => {
  it("answers 404 for an unknown id", async () => {
    const { app } = setup();

    expect((await app.inject({ method: "GET", url: "/speech/nope" })).statusCode).toBe(404);
  });

  it("answers 404 once the audio is 60 seconds old", async () => {
    let now = 0;
    const { app, hub } = setup({ now: () => now });
    const events = collect(hub);
    await app.inject({ method: "POST", url: "/request", payload: { text: "به مامان زنگ بزن" } });
    const url = speechUrlIn(events) ?? "";

    now = 59_999;
    expect((await app.inject({ method: "GET", url })).statusCode).toBe(200);
    now = 60_000;
    expect((await app.inject({ method: "GET", url })).statusCode).toBe(404);
  });
});

describe("POST /audio", () => {
  const post = (app: ReturnType<typeof setup>["app"], payload: Buffer | string = "voice") =>
    app.inject({
      method: "POST",
      url: "/audio",
      headers: { "content-type": "audio/webm;codecs=opus" },
      payload,
    });

  it("transcribes the recording, announces the transcript and runs the request pipeline", async () => {
    const received: SpeechAudio[] = [];
    const stt: Stt = {
      transcribe: async (recording) => {
        received.push(recording);
        return "به مامان زنگ بزن";
      },
    };
    const { tts, spoken } = recordingTts();
    const { app, hub, calls } = setup({ stt, tts });
    const events = collect(hub);

    const response = await post(app, Buffer.from([1, 2, 3]));

    expect(received).toEqual([
      { data: Buffer.from([1, 2, 3]), mimeType: "audio/webm;codecs=opus" },
    ]);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "succeeded",
      agent: "comms",
      reply: "دارم به مامان زنگ می‌زنم",
    });
    expect(calls).toEqual([{ tool: "call_contact", input: { contact: "مامان" } }]);
    expect(events[0]).toEqual({ type: "transcript", text: "به مامان زنگ بزن" });
    expect(events.filter((event) => event.type === "transcript")).toHaveLength(1);
    expect(spoken).toEqual(["دارم به مامان زنگ می‌زنم"]);
    expect(speechUrlIn(events)).toBeDefined();
  });

  it("answers 400 to an empty recording", async () => {
    const { app } = setup();

    const response = await post(app, Buffer.alloc(0));

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "The recording was empty" });
  });

  it("answers 422 when nothing was heard", async () => {
    const { app, calls } = setup({ stt: { transcribe: async () => "  " } });

    const response = await post(app);

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({ error: "Nothing was heard in the recording" });
    expect(calls).toEqual([]);
  });

  it("answers 502 when transcription fails", async () => {
    const stt: Stt = {
      transcribe: async () => {
        throw new Error("bad key");
      },
    };
    const { app } = setup({ stt });

    const response = await post(app);

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({ error: "The recording could not be transcribed: bad key" });
  });
});
