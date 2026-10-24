---
inclusion: always
---

# Structure

## Layout

```
apps/
  server/src/
    orchestrator/   routing, sub-agent loop, agent definitions, tool schemas, stub tools
    contacts/       contact resolution wired into the orchestrator
    llm/            LlmClient interface, OpenRouter client, replay client
    openRouter/     shared OpenRouter plumbing
    stt/            speech-to-text, stub and OpenRouter
    tts/            text-to-speech, stub and OpenRouter
    translation/    caption translation, stub and LLM
    speech/         spoken text and audio store
    events/         event hub for the WebSocket stream
  web/src/
    surfaces/       surface contract, registry, mounting, surface settings
    face/           WebGL face: state machine, blending, blink, mouth, shader
    captions/       bilingual captions surface
    activity/       agent activity panel
    textInput/      typed request surface
    voice/          mic, silence detection, chimes, voice surface
    speech/         audio playback
    events/         live and fake event sources
    request/        HTTP request clients
packages/
  contracts/        AssistantEvent, tool names, type guards. The seam between server and web
  contacts/         contact fixtures, normalization, fuzzy matching
  strings/          every user-facing string
.kiro/
  steering/         product, tech, structure
  specs/<branch>/   one spec folder per feature branch
```

## Request flow

```
mic → web → server STT → orchestrator → sub-agent → tool → result
                              ↓
                   event stream (WebSocket) → surfaces
                              ↓
                     TTS audio → web playback → face mouth
```

## Agents

| Agent | Responsibility |
|---|---|
| Orchestrator | Classifies intent, picks a sub-agent, handles failures |
| Comms | Calls and messages. Fuzzy-matches contact names in any script |
| Home | Smart home control |
| Media | TV and media control |
| Clarifier | Asks one short question when a request is ambiguous |

Agent prompts and tool lists live in `apps/server/src/orchestrator/agents.ts`. Tool schemas live in `toolSchemas.ts`. Stub executors live in `stubTools.ts`.

## Event contract

Defined in `packages/contracts/src/events.ts`. Surfaces render from these events and nothing else.

```ts
type AssistantEvent =
  | { type: "state"; state: AssistantState }
  | { type: "agent"; agent: AgentName }
  | { type: "transcript"; text: string }
  | { type: "tool_call"; tool: string; status: ToolCallStatus }
  | { type: "speech"; audioUrl: string }
  | { type: "caption"; speaker: CaptionSpeaker; text: string; english: string };
```

Every surface must work against a fake event source with no server running.

## Surfaces

A surface is an independent piece of UI registered in `apps/web/src/surfaces/registry.ts`. Each one can be turned off in settings. Surfaces consume the event stream and never import server code.

## Dependency rules

- `packages/contracts` depends on nothing in this repo.
- `packages/*` never import from `apps/*`.
- `apps/web` and `apps/server` never import from each other. They talk only through HTTP, the WebSocket, and `packages/contracts`.
- Tools never import agents. Agents never call external services directly.
- A new cross-module dependency must be stated in the PR description.

## Naming

- Files: camelCase, one module per file, test beside it as `name.test.ts`.
- DOM tests: `name.dom.test.ts`.
- Fixtures live in a `fixtures/` folder next to the code that uses them.
- Specs: `.kiro/specs/<branch-name>/` so teammates' specs never collide.

## Team ownership

Three people work in parallel. Do not edit files outside the current task's area without saying so first.

| Area | Owner |
|---|---|
| `packages/contracts`, `apps/server/src/orchestrator`, extension framework | Sepehr |
| Voice and captions in `apps/web` | Teammate 1 |
| `README.md`, `docs/`, deploy config, `KIRO_LOG.md` | Teammate 2 |