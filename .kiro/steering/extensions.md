---

inclusion: manual

---

# Adding an ability to yazd

A recipe for adding a new ability. Based on how the settings agent was added (commits 62d721c, 5a77e52, e045899). Follow `tech.md` (red/green TDD, no comments, files under 150 lines) and `structure.md` (dependency rules, ownership) throughout.

## 1. What an ability is

- A sub-agent: a name, a system prompt, and a list of tools.
- Its tools: names, typed inputs, and JSON schemas the model sees.
- A tool wrapper, if the tool does real work (validation, emitting events, resolving names). Stubs stay the default implementation.
- An optional surface in `apps/web`, only if the ability needs something on screen or in the browser.
- Replay fixtures, so the ability works with no `OPENROUTER_API_KEY`.

## 2. Checklist, in order

Write the failing test for each step before the code. Run `npm test`, `npm run lint`, `npm run typecheck` at the end of every step.

1. `packages/contracts/src/tools.ts`: add each tool to `toolNames`, and an entry in `ToolInputs` (`name: { field: Type }`). Adding a name breaks every `Record<ToolName, ...>`, so the next steps restore typecheck. Update `packages/contracts/src/isToolName.test.ts`.
2. `packages/contracts/src/events.ts`: add the agent to `agentNames`. Add an event type to `AssistantEvent` only if surfaces must react. If so, extend `isAssistantEvent.ts` and its tests, and handle it in `apps/web/src/activity/describeEvent.ts`, which switches exhaustively. Re-export from `packages/contracts/src/index.ts`.
3. `apps/server/src/orchestrator/agents.ts`: add the entry to `agentDefinitions` with `system` and `tools`. `SubAgentName` is derived from `AgentName`, so typecheck fails until this exists. The router enum is derived from this record.
4. `apps/server/src/orchestrator/routeRequest.ts`: add one line to `routerSystem` saying what the agent handles, and a clause sending mixed or unclear requests to the clarifier.
5. `apps/server/src/orchestrator/toolSchemas.ts`: add a `LlmToolSchema` per tool. Required fields, enums, and min/max belong here. Derive from a registry when one exists, as `apps/server/src/settings/settingToolSchema.ts` does.
6. `apps/server/src/orchestrator/stubTools.test.ts`: add sample inputs for the new tools. `createStubTools` builds stubs from `toolNames`, so no stub code is needed.
7. A wrapper at `apps/server/src/<ability>/with<Ability>.ts`, same shape as `apps/server/src/contacts/withContactResolution.ts`: `with<Ability>(tools: ToolSet, ...deps): ToolSet`, returning `{ ...tools, myTool: wrapped }`.
8. `apps/server/src/app.ts`: wrap the tool set, for example `withSettings(withContactResolution(createStubTools().tools, fixtureContacts), hub)`. Real implementations are chosen here by config, never inside agents.
9. `packages/strings/src/strings.ts`: add a group for the ability. Every user-facing string lives here, with a test in `strings.test.ts`.
10. `apps/web/src/activity/describeEvent.ts`: if you added an event, describe it with text from the strings group.
11. `apps/web/src/<ability>/` and `apps/web/src/surfaces/registry.ts`: only for a surface. Provide shared state through `SurfaceContext` in `apps/web/src/surfaces/surface.ts` and `apps/web/src/testing/testContext.ts`, and create it in `apps/web/src/main.ts`. Every surface must work against a fake event source.
12. `apps/server/src/orchestrator/fixtures/<name>.json`, then register it in `apps/server/src/llm/replayConversations.ts`. Shape: `{ "transcript": "...", "responses": [route, tool_use, final text] }`, copied from `speakSlower.json`.

## 3. Rules every ability follows

- Prompts say "the user's language, the language the user spoke". They never name a language.
- The prompt ends with a one-sentence spoken confirmation, and asks one short question when a detail is missing.
- Tool inputs are validated before execution. Reject unknown names and out-of-range values. Return an `ok: true` result with `applied: false` and a reason the model can speak, instead of failing the run.
- Side effects stay behind a tool. Agents never call external services.
- External boundaries are injected: clock, network, storage, audio, the LLM. Tests pass fakes. Never mock the module under test.
- Match text through the normalizers in `packages/contacts`, not with ad hoc string compares.
- Do not edit outside the task's area without saying so. Web voice, captions, and speech belong to Teammate 1.
- A new dependency needs a stated reason. Never edit `.env.example` or `KIRO_LOG.md` as part of an ability.

## 4. Tests every ability ships with

- Agent prompt test in `apps/server/src/orchestrator/agents.test.ts`: the entry exists, lists the right tools, contains "the user's language", and does not match `/farsi/i`. Assert any value mappings the prompt promises.
- Router test in `apps/server/src/orchestrator/routeRequest.test.ts`: the enum includes the agent, the prompt mentions it, and a recorded routing response reaches the agent (see `orchestrator.settings.test.ts`).
- Tool wrapper test in `apps/server/src/<ability>/with<Ability>.test.ts`, using `createRecordingEventBus`: valid input, each rejection path, no side effect on rejection. Add a fast-check property for any rule that must hold for every input.
- Schema test in `apps/server/src/orchestrator/toolSchemas.test.ts`.
- One end-to-end fixture test: replay the fixture through the real orchestrator (`<ability>Replay.test.ts`), then through `createApp({})` with no API key (`<ability>App.test.ts`), reading `/events` for the expected event.
- Web tests for anything added in `apps/web`, in `name.test.ts` or `name.dom.test.ts` beside the code.

## 5. Worked example: settings

- Contracts: `packages/contracts/src/settings.ts` (registry and defaults), `isSetting.ts`, `tools.ts`, `events.ts`, `isAssistantEvent.ts`.
- Agent and routing: `apps/server/src/orchestrator/agents.ts`, `routeRequest.ts`, `toolSchemas.ts`.
- Wrapper: `apps/server/src/settings/withSettings.ts` and `settingToolSchema.ts`, wired in `apps/server/src/app.ts`. It emits `setting_changed` and `settings_reset` on the hub.
- Strings and activity: `packages/strings/src/strings.ts` (`strings.settings`), `apps/web/src/activity/describeEvent.ts`.
- Web state: `apps/web/src/settings/` (`applyEvent.ts`, `settingsStorage.ts`, `settingsStore.ts`), provided through `SurfaceContext`.
- Surfaces that read it: `speech/speechPlayer.ts`, `captions/captionsSurface.ts`, `voice/voiceSurface.ts`.
- Fixtures: `orchestrator/fixtures/speakSlower.json`, `resetSettings.json`, registered in `llm/replayConversations.ts`.
- Tests: `agents.test.ts`, `routeRequest.test.ts`, `orchestrator.settings.test.ts`, `toolSchemas.test.ts`, `settings/withSettings*.test.ts`, `settings/settingsReplay.test.ts`, `settings/settingsApp.test.ts`.

## 6. Common mistakes

- Relative requests like "bigger" need explicit mappings in the prompt. The model picked `large`, which was already the default, so nothing changed. Map relative words to absolute values that move from the default toward the extreme, and test that the prompt contains them.
- Fixtures only match exact transcripts, trimmed. A reworded request gets "No recorded response". Keep demo phrases identical to the fixture transcript, in the original script.
- A new tool name, agent name, or event type breaks exhaustive records and switches elsewhere. Expect typecheck to fail until each is handled, and fix with the minimal change.
- Property tests written after the code never show red. Write them against the missing module first.
- Adding a store listener to a surface context changed `listenerCount()` in existing tests. Keep shared-state subscriptions separate from surface listeners.
- Tests that touch real timers or sockets flake. Inject a fake clock, and wait on events with a deadline.
- Files grow past 150 lines in tests first. Split into `name.property.test.ts` and shared fixtures early.
