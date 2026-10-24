# Requirements Document

## Introduction

The clock ability lets a user who cannot see a clock ask yazd for the current time and day. The user speaks a request such as "ساعت چنده؟" ("what time is it?"). The Orchestrator routes the request to a new Clock_Agent, which calls one tool, get_time, that takes no input. The tool reads the current moment from an injected Clock, so tests control time with a fake clock. The Clock_Agent speaks the time and day in one short sentence in the language the user spoke.

The ability follows the extension recipe in `.kiro/steering/extensions.md`. It adds no new event type and no new surface. A replay fixture for the exact Farsi request lets the ability work with no `OPENROUTER_API_KEY`.

## Glossary

- **Yazd**: The voice-first assistant, made of the Server and the Web app.
- **Server**: The Node backend in `apps/server` that hosts the Orchestrator, the Tool_Set, and the Event_Hub.
- **Orchestrator**: The agent that classifies intent and routes a request to a sub-agent.
- **Router**: The part of the Orchestrator that picks a sub-agent from the router system prompt and the agent name enum.
- **Clock_Agent**: The sub-agent named `clock` that answers questions about the current time and day.
- **Agent_Definitions**: The record in `apps/server/src/orchestrator/agents.ts` that holds each sub-agent's system prompt and tool list.
- **get_time**: The tool that returns the current time and day. The tool takes no input.
- **Clock**: An injected boundary that returns the current moment as a `Date`.
- **Fake_Clock**: A Clock used in tests that returns a fixed, caller-chosen moment.
- **Clock_Wrapper**: The function `withClock(tools, clock)` in `apps/server/src/clock/withClock.ts` that returns a Tool_Set whose get_time uses the injected Clock.
- **Tool_Set**: The map from tool name to executor that agents call.
- **Time_Result**: The successful result of get_time, holding the hour, minute, and weekday of the current moment.
- **Tool_Schema**: The `LlmToolSchema` entry for get_time in `apps/server/src/orchestrator/toolSchemas.ts`.
- **Contracts**: The package `packages/contracts`, which holds tool names, agent names, and event types.
- **Strings_Package**: The package `packages/strings`, which holds every user-facing string.
- **Replay_Fixture**: A recorded model conversation in `apps/server/src/orchestrator/fixtures/` registered in `apps/server/src/llm/replayConversations.ts`.
- **App**: The Server application built by `createApp` in `apps/server/src/app.ts`.
- **Event_Stream**: The WebSocket and `/events` stream of `AssistantEvent` values.
- **Clock_Request**: The Farsi transcript "ساعت چنده؟" recorded in the Replay_Fixture.

## Requirements

### Requirement 1: Register the clock tool and agent name in Contracts

**User Story:** As a developer, I want the get_time tool and the clock agent declared in Contracts, so that server and web share one typed vocabulary.

#### Acceptance Criteria

1. THE Contracts SHALL include exactly one entry equal to `get_time` in `toolNames`, and SHALL retain every tool name that was in `toolNames` before this change.
2. THE Contracts SHALL declare the input type of `get_time` in `ToolInputs` as an object with zero fields.
3. THE Contracts SHALL include exactly one entry equal to `clock` in `agentNames`, and SHALL retain every agent name that was in `agentNames` before this change.
4. WHEN a string equal to `get_time` is checked, THE Contracts type guard for tool names SHALL return true.
5. WHEN a string not listed in `toolNames` is checked, THE Contracts type guard for tool names SHALL return false.
6. IF the value checked by the tool name type guard is not a string (including `undefined`, `null`, a number, an object, or an empty string), THEN THE Contracts type guard for tool names SHALL return false without throwing.
7. THE Contracts SHALL keep the `AssistantEvent` union unchanged, with the same six event variants and the same fields on each variant.
8. THE Contracts SHALL keep the Contracts package free of imports from other packages and apps in this repository.

### Requirement 2: Define the Clock_Agent

**User Story:** As a user who cannot see a clock, I want a dedicated agent for time questions, so that yazd answers them in one short spoken sentence.

#### Acceptance Criteria

1. THE Agent_Definitions SHALL contain exactly one entry named `clock` whose tool list contains exactly one tool, `get_time`, and no other tools.
2. THE Agent_Definitions entry for `clock` SHALL contain a system prompt that includes the exact phrase "the user's language" as an instruction to reply in the language the user spoke.
3. THE Agent_Definitions entry for `clock` SHALL contain a system prompt that does not match the case-insensitive pattern `/farsi|persian|english|arabic/i`.
4. THE Agent_Definitions entry for `clock` SHALL contain a system prompt that instructs the Clock_Agent to state both the time and the day of the week in a single short sentence.
5. THE Agent_Definitions entry for `clock` SHALL contain a system prompt that instructs the Clock_Agent to call `get_time` before producing its spoken answer, and to take the time and day only from the `get_time` result.
6. IF the `get_time` result has `applied: false`, THEN THE Clock_Agent system prompt SHALL instruct the Clock_Agent to reply with one short sentence in the user's language saying the time is unavailable, and to state no time or day.

### Requirement 3: Route time questions to the Clock_Agent

**User Story:** As a user, I want my time question to reach the clock agent, so that I get the current time without choosing an agent.

#### Acceptance Criteria

1. THE Router SHALL include `clock` as one of the allowed values of the sub-agent name enum in the routing schema, alongside the existing sub-agent names.
2. THE Router system prompt SHALL contain exactly one line stating that the clock agent handles questions about the current time and the current day of the week.
3. THE Router system prompt SHALL contain exactly one clause stating that a request combining a time question with a request for any other ability is routed to the clarifier.
4. THE Router system prompt SHALL contain no language names.
5. WHEN the recorded routing response selects `clock`, THE Orchestrator SHALL run the Clock_Agent for that request and SHALL NOT run any other sub-agent for that request.
6. WHEN the recorded routing response for a request mixing a time question with another ability selects the clarifier, THE Orchestrator SHALL run the Clarifier and SHALL NOT run the Clock_Agent for that request.

### Requirement 4: Describe get_time to the model

**User Story:** As a developer, I want a tool schema for get_time, so that the model can call the tool with valid input.

#### Acceptance Criteria

1. THE Tool_Schema SHALL declare the name `get_time`, matching the entry in `toolNames` exactly.
2. THE Tool_Schema SHALL declare an input object with zero properties and zero required fields.
3. THE Tool_Schema SHALL include a description of 1 to 200 characters that states the tool returns the current time and the current day.
4. WHEN the model calls `get_time` with an empty input object, THE Orchestrator SHALL execute the tool.
5. IF the model calls a tool name that is not declared in the Tool_Schema set, THEN THE Orchestrator SHALL reject the call with its existing unknown-tool error, without executing any tool.

### Requirement 5: Read the time through an injected Clock

**User Story:** As a developer, I want the current moment read from an injected Clock, so that tests control time with a Fake_Clock.

#### Acceptance Criteria

1. THE Clock_Wrapper SHALL accept a Tool_Set and a Clock and return a Tool_Set that contains every tool of the input Tool_Set under its original name, with `get_time` replaced by the clock-backed executor.
2. WHEN get_time is executed, THE Clock_Wrapper SHALL read the current moment from the injected Clock exactly once per execution.
3. WHEN get_time is executed, THE Clock_Wrapper SHALL return an `ok: true` result containing a Time_Result.
4. THE Time_Result SHALL contain the hour as an integer from 0 to 23 in 24-hour format.
5. THE Time_Result SHALL contain the minute as an integer from 0 to 59.
6. THE Time_Result SHALL contain the weekday as exactly one of "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", or "Sunday".
7. FOR ALL moments returned by a Fake_Clock, THE Time_Result SHALL match the hour, minute, and weekday of that moment in the local time zone of the Server (property).
8. FOR ALL moments returned by a Fake_Clock, executing get_time twice with the same Fake_Clock SHALL produce equal Time_Result values (idempotence property).
9. WHEN get_time is executed with an input object containing one or more fields, THE Clock_Wrapper SHALL ignore the extra fields, return `ok: true`, and return the same Time_Result as for an empty input object.
10. WHEN get_time is executed, THE Clock_Wrapper SHALL publish zero events to the Event_Hub and SHALL leave every other tool of the Tool_Set unchanged.
11. IF the injected Clock throws an error, THEN THE Clock_Wrapper SHALL return an `ok: true` result with `applied: false` and a reason string of 1 to 200 characters taken from the clock group in the Strings_Package, SHALL NOT rethrow the error, and SHALL remain usable for subsequent get_time executions.
12. IF the injected Clock returns an invalid moment (not a finite date value), THEN THE Clock_Wrapper SHALL return an `ok: true` result with `applied: false` and the same reason as for a thrown error, and SHALL NOT return a Time_Result.

### Requirement 6: Wire the Clock_Wrapper into the App

**User Story:** As a user, I want the clock ability active when the app runs, so that I can ask for the time without any API key.

#### Acceptance Criteria

1. WHEN `createApp` is called, THE App SHALL wrap the Tool_Set with the Clock_Wrapper using a system Clock whose `now()` returns the current date and time at the moment of each call.
2. WHEN `createApp({})` is called with no `OPENROUTER_API_KEY`, THE App SHALL select the replay LLM client, so that no network request is made.
3. WHEN the Clock_Request is submitted to an App created with no `OPENROUTER_API_KEY`, THE App SHALL emit an `agent` event for `clock` and a `speech` event within 2000 ms.
4. THE App SHALL keep the existing wrapper composition, so that a settings request and a contact-resolution request each produce the same events and results as before the Clock_Wrapper was added.
5. THE system Clock SHALL be created only in `apps/server/src/app.ts` and passed to the Clock_Wrapper by injection, so that no agent or tool module constructs its own Clock.

### Requirement 7: Keep stub coverage and user-facing strings consistent

**User Story:** As a developer, I want stubs and strings to cover the new ability, so that tests and demos stay safe and no string is inline.

#### Acceptance Criteria

1. THE stub Tool_Set SHALL contain exactly one stub executor keyed `get_time`, created from `toolNames` with no new stub code.
2. WHEN the stub executor for `get_time` runs with its sample input, THE stub executor SHALL return a successful result and SHALL make no call to any external service.
3. THE stub tools test SHALL include a sample input for `get_time`.
4. WHERE the Clock_Wrapper returns a spoken reason, THE Clock_Wrapper SHALL take that reason from the clock group in the Strings_Package and SHALL contain zero inline user-facing string literals.
5. THE Strings_Package SHALL contain a test that asserts every key in the clock group is a string with a trimmed length of at least 1 character.
6. IF adding `get_time` or `clock` breaks an exhaustive record or switch in the web app, THEN THE Web app SHALL receive only the minimal change that restores `npm run typecheck` to zero errors, with no new behavior, no new surface, and no user-facing string outside the Strings_Package.

### Requirement 8: Provide a Replay_Fixture for the Clock_Request

**User Story:** As a user and a demo presenter, I want the Farsi time question to work with no API key, so that the demo runs offline.

#### Acceptance Criteria

1. THE Replay_Fixture SHALL contain the transcript "ساعت چنده؟" exactly, as a single string with no leading or trailing whitespace.
2. THE Replay_Fixture SHALL contain exactly three recorded responses in this order: a `route_to_agent` tool use whose agent is `clock`, a `get_time` tool use with an empty input object, and a final `end_turn` response containing one non-empty spoken text.
3. THE Replay_Fixture SHALL follow the JSON shape of `speakSlower.json`, with a `transcript` string and a `responses` array whose entries each carry a `stopReason` and a `content` array.
4. THE Replay_Fixture SHALL be registered in `apps/server/src/llm/replayConversations.ts` alongside the existing fixtures, without removing or changing any existing registration.
5. WHEN the Replay_Fixture is replayed through the real Orchestrator with a Fake_Clock, THE Orchestrator SHALL emit exactly one `agent` event for `clock`.
6. WHEN the Replay_Fixture is replayed through the real Orchestrator with a Fake_Clock, THE Orchestrator SHALL emit a `tool_call` event for `get_time` with status `started`, followed by a `tool_call` event for `get_time` with status `succeeded`.
7. WHEN the Clock_Request is sent to `createApp({})` and `/events` is read, THE App SHALL return the `agent` event for `clock` and at least one `speech` event, without `OPENROUTER_API_KEY` and without any network call.
8. IF a transcript differs from the recorded transcript after trimming leading and trailing whitespace, THEN THE replay client SHALL return its existing "No recorded response" error unchanged.

### Requirement 9: Test the ability with the recipe tests

**User Story:** As a maintainer, I want the full recipe test set, so that the ability is verified without calling a paid API.

#### Acceptance Criteria

1. THE agent prompt test in `apps/server/src/orchestrator/agents.test.ts` SHALL assert that the `clock` entry exists, lists exactly one tool named `get_time`, contains the exact text "the user's language", and does not match `/farsi/i`.
2. THE router test in `apps/server/src/orchestrator/routeRequest.test.ts` SHALL assert that the agent-name enum includes `clock`, that the router prompt mentions the clock agent, and that a recorded routing response naming `clock` reaches the Clock_Agent.
3. THE Clock_Wrapper test SHALL cover a valid call that returns the Fake_Clock time, the error path in which the Fake_Clock throws, and the absence of side effects, using a Fake_Clock and `createRecordingEventBus`.
4. WHEN the error path test runs, THE Clock_Wrapper test SHALL assert an `ok: true` result with `applied: false` and that the recording event bus holds zero events.
5. WHEN the absence-of-side-effects test runs, THE Clock_Wrapper test SHALL assert that the Fake_Clock is read once and that no other tool executor is invoked.
6. THE Clock_Wrapper test suite SHALL include one fast-check property for requirement 5.7 and one fast-check property for requirement 5.8, each running at least 100 generated cases.
7. THE schema test in `apps/server/src/orchestrator/toolSchemas.test.ts` SHALL assert the Tool_Schema for `get_time`.
8. THE replay test `clockReplay.test.ts` SHALL replay the Replay_Fixture through the real Orchestrator with a Fake_Clock and assert the emitted `agent` and `tool_call` events and that the `get_time` result carries the Fake_Clock hour, minute, and weekday.
9. THE app test `clockApp.test.ts` SHALL replay the Replay_Fixture through `createApp({})` with `OPENROUTER_API_KEY` unset and assert that the expected events are emitted.
10. THE test suite SHALL run without calling a paid API, without real timers, and without opening real sockets.
11. WHEN `npm test`, `npm run lint`, and `npm run typecheck` are run, THE repository SHALL pass all three with exit code 0.

### Requirement 10: Respect process, ownership, and scope constraints

**User Story:** As a team member, I want the ability to stay inside its boundaries, so that parallel work does not collide.

#### Acceptance Criteria

1. WHEN the implementation adds or changes behavior, THE implementation SHALL show a failing run of the test for that behavior, with a failure reason matching the missing behavior, before any implementation code for that behavior is written.
2. THE implementation SHALL contain zero code comments in every new and changed source file.
3. THE implementation SHALL keep every new and changed file at 149 lines or fewer.
4. THE implementation SHALL leave the dependency lists of every `package.json` and the lockfile unchanged.
5. THE implementation SHALL leave `.env.example` and `KIRO_LOG.md` unchanged.
6. THE implementation SHALL leave the set of `AssistantEvent` types unchanged and SHALL add zero entries to the surface registry.
7. THE implementation SHALL leave every file under the web voice, captions, and speech directories unchanged.
8. THE task list SHALL order top-level tasks as contracts first, server second, web third, and fixtures last, and SHALL contain between 1 and 10 top-level tasks.
9. IF a task requires editing a file outside the area of the current task, THEN THE implementation SHALL state the file and the reason in the task notes before editing it.
10. WHEN a task is marked done, THE implementation SHALL show that `npm test`, `npm run lint`, and `npm run typecheck` all exit with code 0.
