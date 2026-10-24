# Implementation Plan: Clock

## Overview

The clock ability follows `.kiro/steering/extensions.md`: contracts first, then server, then web, then fixtures. Every task is red/green TDD. Write the failing test first and run it to confirm it fails for the expected reason. Then implement, then run `npm test`, `npm run lint`, and `npm run typecheck`. TypeScript throughout. fast-check is already a root devDependency, so no dependency changes. No code comments, files under 150 lines, and `.env.example`, `KIRO_LOG.md`, and web voice, captions, and speech are never edited.

## Tasks

- [x] 1. Contracts and strings
  - [x] 1.1 Add `get_time` and `clock` to Contracts, with the clock strings group
    - Red: extend `packages/contracts/src/isToolName.test.ts` so `get_time` is accepted, the exact `toolNames` list is asserted, `clock` is in `agentNames`, and non-string values return false without throwing. Add a nonblank-keys test for `strings.clock` in `packages/strings/src/strings.test.ts`. Run and confirm they fail because the names and group are missing.
    - Green: append `"get_time"` to `toolNames` and `get_time: Record<string, unknown>` to `ToolInputs` in `packages/contracts/src/tools.ts`. Append `"clock"` to `agentNames` in `packages/contracts/src/events.ts`. Leave `AssistantEvent` unchanged. Add `clock: { unavailable: "The time is unavailable" }` to `packages/strings/src/strings.ts`.
    - Typecheck is expected to fail on exhaustive `Record<ToolName, ...>` and `SubAgentName` sites until tasks 2 and 4 restore it. Typecheck failing after tasks 1 to 3 is expected until task 4.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 7.4, 7.5_

- [x] 2. Server: the clock agent
  - [x] 2.1 Add the `clock` entry to `agentDefinitions`
    - Red: in `apps/server/src/orchestrator/agents.test.ts`, assert the `clock` entry exists, lists exactly `["get_time"]`, contains "the user's language", does not match `/farsi|persian|english|arabic/i`, and promises: both time and day in one short sentence, call `get_time` first and take values only from its result, and an `applied: false` reply that states no time or day. Confirm red.
    - Green: add the entry in `apps/server/src/orchestrator/agents.ts` using the prompt from the design.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 9.1_

- [x] 3. Server: routing
  - [x] 3.1 Teach the router about `clock`
    - Red: in `apps/server/src/orchestrator/routeRequest.test.ts`, assert the enum includes `clock`, the router prompt contains exactly one clock line and exactly one mixed-request clarifier clause, and contains no language names. Add a test that a recorded routing response naming `clock` runs only the Clock_Agent, and one naming `clarifier` for a mixed request runs only the Clarifier (pattern: `orchestrator.settings.test.ts`). Confirm red.
    - Green: in `apps/server/src/orchestrator/routeRequest.ts`, add the line `clock: questions about the current time or the current day of the week.` to `routerSystem`. Merge the time-plus-other-ability case into the existing clarifier clause so one such clause remains.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 9.2_

- [x] 4. Server: tool schema and stub coverage
  - [x] 4.1 Add the `get_time` schema and stub sample input
    - Red: in `apps/server/src/orchestrator/toolSchemas.test.ts`, assert the `get_time` name, zero properties, zero required fields, and a description of 1 to 200 characters mentioning time and day. In `apps/server/src/orchestrator/stubTools.test.ts`, add `get_time: {}` and assert the stub returns a successful result. Confirm red. Add a test that an undeclared tool name is rejected with the existing unknown-tool error and runs nothing.
    - Green: add the `LlmToolSchema` entry in `apps/server/src/orchestrator/toolSchemas.ts`. No stub code is needed because `createStubTools` builds from `toolNames`.
    - Full verification: `npm test`, `npm run lint`, and `npm run typecheck` must all pass here. This restores the typecheck left open by task 1.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.2, 7.3, 9.7_

- [x] 5. Server: clock module
  - [x] 5.1 Create `Clock`, `readMoment`, and `withClock`
    - Red: write `apps/server/src/clock/withClock.test.ts` first, against the missing module. Use a Fake_Clock and `createRecordingEventBus`. Cover a valid call returning hour, minute, and weekday in local time. Cover a throwing clock returning `ok: true` with `applied: false` and `strings.clock.unavailable`, then recovering on the next call. Cover an invalid date giving the same result, a single clock read per execution, zero events, and other tools unchanged and not invoked. Confirm red because the module is missing.
    - Green: create `apps/server/src/clock/clock.ts` (`interface Clock { now(): Date }`), `readMoment.ts` (reads once, returns `undefined` on a throw or non-finite date), and `withClock.ts` (`withClock(tools, clock): ToolSet`, replacing only `get_time`). Take the reason from `strings.clock`.
    - This adds the cross-module dependency `clock/withClock.ts` to `packages/strings`. State it in the PR description.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.10, 5.11, 5.12, 7.4, 9.3, 9.4, 9.5, 9.10_

- [x] 6. Server: wire the system clock into the app
  - [x] 6.1 Compose `withClock` in `createApp`
    - Red: add `apps/server/src/clock/clockWiring.test.ts` asserting that `createApp({})` executes `get_time` through the clock-backed executor rather than the stub, and that existing settings and contact-resolution tests still pass unchanged. Confirm red.
    - Green: in `apps/server/src/app.ts`, create `const clock: Clock = { now: () => new Date() }` (the only place a system Clock is built) and wrap as `withClock(withSettings(withContactResolution(createStubTools().tools, fixtureContacts), hub), clock)`. Keep the file under 150 lines, and state it if extraction is needed.
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 10.9_

- [x] 7. Fixtures: recorded conversation and registration
  - [x] 7.1 Add `clock.json` and register it
    - Red: add a test (in `apps/server/src/clock/clockReplay.test.ts`, first case) that the replay client finds a response for the exact transcript `ساعت چنده؟`, that a transcript differing after trimming still returns the existing "No recorded response" error, and that the fixture has exactly three responses in order: `route_to_agent` `{ "agent": "clock" }`, `get_time` `{}`, and a non-empty `end_turn` text. Confirm red.
    - Green: create `apps/server/src/orchestrator/fixtures/clock.json` in the `speakSlower.json` shape with a neutral Farsi sentence as the final text (no real time). Register it after `resetSettings` in `apps/server/src/llm/replayConversations.ts` without changing any existing registration.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.8_

- [x] 8. Fixtures: end-to-end replay and app tests
  - [x] 8.1 Write `clockReplay.test.ts` against the real orchestrator
    - Replay the fixture through the real orchestrator with a Fake_Clock. Assert exactly one `agent` event for `clock`, a `tool_call` `get_time` `started` followed by `succeeded`, and that the `get_time` result carries the Fake_Clock hour, minute, and weekday. No paid API, real timers, or sockets.
    - _Requirements: 8.5, 8.6, 9.8, 9.10_

  - [x] 8.2 Write `clockApp.test.ts` through `createApp({})`
    - With `OPENROUTER_API_KEY` unset, send the Clock_Request and read `/events`. Assert the `agent` event for `clock` and at least one `speech` event within 2000 ms, with no network call and no real sockets.
    - _Requirements: 6.3, 8.7, 9.9, 9.10_

- [x] 9. Final verification
  - [x] 9.1 Run the full suite and the scope checks
    - Run `npm test`, `npm run lint`, and `npm run typecheck`, and show all three exiting 0.
    - Confirm with `git status` and `git diff` that `.env.example`, `KIRO_LOG.md`, every `package.json`, the lockfile, and the web voice, captions, and speech directories are unchanged. Confirm there are no new comments and every new or changed file is 149 lines or fewer.
    - Ensure all tests pass, ask the user if questions arise.
    - _Requirements: 9.11, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.10_

## Notes

- Optional property tests were skipped by decision. The settings ability already covers property-based testing.
- Web has no changes. If typecheck fails in `apps/web`, stop and report instead of editing.
- Adding `get_time` to `toolNames` breaks typecheck after tasks 1 to 3 until task 4 restores it. The quality gate hook failing typecheck there is expected. Note it and continue.
- The clock agent adds no new event type and no new surface.
- Live-model wording is checked only in `npm run eval`, never in `npm test`.
- Task 6 uses its own `clockWiring.test.ts`, separate from `clockApp.test.ts` in task 8.2.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["5.1"] },
    { "id": 5, "tasks": ["6.1"] },
    { "id": 6, "tasks": ["7.1"] },
    { "id": 7, "tasks": ["8.1"] },
    { "id": 8, "tasks": ["8.2"] },
    { "id": 9, "tasks": ["9.1"] }
  ]
}
```
