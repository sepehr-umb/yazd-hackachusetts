---
inclusion: always
---

# Tech

## Stack

- TypeScript everywhere, npm workspaces monorepo
- Backend: Node, Fastify, `ws`
- LLM, speech-to-text, text-to-speech, and translation: OpenRouter (OpenAI-compatible API), behind interfaces
- Frontend: Vite, WebGL2, Web Audio API
- Tests: Vitest, with happy-dom for DOM tests
- Lint and format: ESLint, Prettier

## Commands

```bash
npm install
npm test
npm run test:watch
npm run eval
npm run dev
npm run lint
npm run typecheck
```

## Workflow: red/green TDD

All code is written test-first. This is not optional.

1. **Red.** Write one failing test for the next behavior. Run it. Confirm it fails for the expected reason before writing any implementation.
2. **Green.** Write the minimum code that makes it pass. Run the full suite.
3. **Refactor.** Clean up with all tests green. Run the suite again.

Rules:
- Never write implementation code without a failing test that requires it.
- Never change a test to make it pass unless the test itself was wrong. Say so explicitly when that happens.
- Show the red run output before the green run output.
- One behavior per cycle. Small steps.
- Mock only at the boundaries: OpenRouter, Home Assistant, Jellyfin, the device shell. Never mock the module under test.
- Agent routing is tested with recorded model responses as fixtures. Live-model evaluation runs only in `npm run eval`, never in `npm test`.
- Shader code is checked visually. Everything feeding the shader is unit tested.
- Use property-based tests for rules that must hold for every input: text normalization, contact matching, bounded settings, reset behavior.
- A task is done only when `npm test`, `npm run lint`, and `npm run typecheck` all pass.

## Code style

- No code comments. Code explains itself through names and structure.
- Small modules with one job each. Keep files under 150 lines.
- Prefer pure functions. Push side effects to the edges.
- User-facing strings live in `packages/strings`, never inline.
- No speculative abstractions. Build only what the current task asks for.
- Prefer deleting code to adding it.

## Tools and side effects

- Every side effect goes through a tool behind an interface.
- Each tool has a `stub` implementation for tests and demos and a `real` implementation selected by config.
- Agents never call external services directly. They call tools.
- Tool input is validated before execution. Unknown names and out-of-range values are rejected.
- Agent loops have a step limit.

## Language handling

- Prompts never hardcode a language. Agents reply in the language the user spoke.
- Text matching normalizes Persian and Arabic variants: alef forms, yeh and kaf variants, teh marbuta, ZWNJ, diacritics, extra whitespace.
- Captions carry the original text and an English translation.

## Secrets

- Keys live in `.env`, which is gitignored. Never commit keys. Never print them in logs or output.
- `.env.example` lists every variable with an empty value.
- Variables: `OPENROUTER_API_KEY`, `LLM_MODEL`, `STT_MODEL`, `TTS_MODEL`, `TTS_VOICE`, `TTS_FORMAT`, `HA_URL`, `HA_TOKEN`, `JELLYFIN_URL`, `JELLYFIN_TOKEN`.
- Every OpenRouter client is used only when `OPENROUTER_API_KEY` is set. Without it, the app runs on stubs and replay fixtures.

## Do not

- Do not add a dependency without stating why.
- Do not call a paid API in the default test suite.
- Do not place real calls or send real messages from tests or demos.
- Do not change the event contract without updating both sides and their tests.
- Do not run `npm audit fix` or upgrade major versions.
- Do not add `.kiro` to `.gitignore`.