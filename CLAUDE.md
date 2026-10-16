# Project Mahmood

A Farsi voice assistant built as a suite of agents. The user speaks a request. An orchestrator agent routes it to a sub-agent that acts: call or message a contact, control smart home devices, control the TV. An animated face on screen shows what the assistant is doing and moves its mouth when it speaks.

The primary user is an elderly Farsi speaker with near-total vision loss and limited dexterity. Audio feedback is the main interface. The face is a secondary interface for sighted users and for demos.

This repo serves three deliverables:
- Agentic AI class project
- Graphics (WebGL) class final project: the face
- Hackathon demo

## Architecture

```
mic → frontend → backend (STT) → orchestrator → sub-agent → tool → result
                                      ↓
                              event stream (WebSocket) → face
                                      ↓
                                TTS audio → frontend playback → face mouth
```

- **Frontend** (`apps/web`): mic capture, audio playback, the face, an agent-activity panel. Plain web app, installable as a PWA.
- **Backend** (`apps/server`): speech-to-text, the orchestrator, sub-agents, tools, TTS, WebSocket server.
- **Shared** (`packages/contracts`): event and tool type definitions used by both sides. This is the seam between backend and face. Change it deliberately.

### Agents

| Agent | Responsibility |
|---|---|
| Orchestrator | Classifies intent, picks a sub-agent, handles failures and retries |
| Comms | Calls and messages. Fuzzy-matches Farsi contact names |
| Home | Smart home control through Home Assistant |
| Media | TV and Jellyfin control |
| Clarifier | Asks a short follow-up question when a request is ambiguous |

The orchestrator and sub-agents run on the Claude API with tool use.

### Tools

Every side effect goes through a tool behind an interface. Each tool has a `stub` implementation for tests and demos and a `real` implementation selected by config.

| Tool | Real implementation |
|---|---|
| `call_contact` | Native Android shell (WhatsApp call intent), later |
| `send_message` | Native Android shell, later |
| `set_light` | Home Assistant REST API |
| `media_control` | Jellyfin remote session API |
| `ask_for_clarification` | Returns a question to speak back to the user |

Agents never call external services directly. They call tools.

## Event contract

The backend emits events over WebSocket. The face renders from these and nothing else.

```ts
type AssistantState = "idle" | "listening" | "thinking" | "speaking" | "error";

type AssistantEvent =
  | { type: "state"; state: AssistantState }
  | { type: "agent"; agent: "orchestrator" | "comms" | "home" | "media" | "clarifier" }
  | { type: "transcript"; text: string }
  | { type: "tool_call"; tool: string; status: "started" | "succeeded" | "failed" }
  | { type: "speech"; audioUrl: string };
```

The face must work against a fake event source with no backend running.

## Face

- Stylized, not realistic. Built from shapes driven by shader uniforms.
- States map to expressions: idle, listening, thinking, speaking, error.
- Mouth opening is driven by playback amplitude from a Web Audio `AnalyserNode`, smoothed with fast attack and slow release. This is language-agnostic and works for Farsi.
- Viseme lip sync is a later upgrade, not a requirement.
- Rendering logic lives in pure, testable modules (state machine, amplitude smoothing, expression blending). The WebGL draw code stays thin.

## Workflow: red/green TDD

All code is written test-first.

1. **Red.** Write one failing test for the next behavior. Run it. Confirm it fails for the expected reason before writing any implementation.
2. **Green.** Write the minimum code that makes it pass. Run the full suite.
3. **Refactor.** Clean up with all tests green. Run the suite again.
4. Commit after each green step.

Rules:
- Never write implementation code without a failing test that requires it.
- Never change a test to make it pass unless the test itself was wrong. Say so explicitly when that happens.
- Show the red run output before the green run output.
- One behavior per cycle. Small steps.
- Mock only at the boundaries: Anthropic API, OpenAI API, Home Assistant, Jellyfin, the device shell. Never mock the module under test.
- Agent routing is tested with recorded model responses as fixtures. Live-model evaluation runs in a separate suite (`npm run eval`) and is not part of the default test run.
- Shader code is checked visually. Everything feeding the shader is unit tested.

## Stack

- TypeScript everywhere, npm workspaces monorepo
- Backend: Node, Fastify, `ws`, Anthropic SDK, OpenAI SDK (Whisper STT)
- Frontend: Vite, WebGL2, Web Audio API
- Tests: Vitest
- Lint and format: ESLint, Prettier

## Commands

```bash
npm install
npm test
npm run test:watch
npm run eval
npm run dev
```

## Code style

- No code comments. Code explains itself through names and structure.
- Small modules with one job each.
- Prefer pure functions. Push side effects to the edges.
- Farsi strings live in one place (`packages/strings`), never inline.

## Secrets

- Keys live in `.env`, which is gitignored. Never commit keys.
- `.env.example` lists every variable with an empty value.
- Variables: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `HA_URL`, `HA_TOKEN`, `JELLYFIN_URL`, `JELLYFIN_TOKEN`.

## Do not

- Do not add a dependency without stating why.
- Do not call a paid API in the default test suite.
- Do not place real calls or send real messages from tests or demos. Use stubs.
- Do not change the event contract without updating both sides and their tests.
