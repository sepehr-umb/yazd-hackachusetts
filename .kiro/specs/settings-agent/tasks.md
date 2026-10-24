# Implementation Plan: Settings Agent

## Overview

Implementation language is TypeScript, as used in the design. Order of groups: contracts, checkpoint, server, web store, surfaces, fixtures, final verification.

Rules that apply to every task:

- Red/green TDD, one behavior per task. Write the failing test first, run it, record the red output, and confirm it fails for the expected reason (not a syntax error or missing import unrelated to the behavior). Then write the minimum code and run again for green. Refactor steps run only with all tests green.
- Property tests that pass on first run must be shown red by temporarily mutating the production code (for example removing a bounds check), recording the red output with the seed and shrunk counterexample, then restoring the code and recording green.
- Every task ends with `npm test`, `npm run lint`, and `npm run typecheck` all passing. The only exception: typecheck is expected to be red after task 1.1 and is restored to green by task 1.2. Nothing else may end red.
- Never touch `KIRO_LOG.md` or `.env.example`.
- Do not commit. The user commits.
- No code comments in any code, new or modified.
- Mocks and fakes only at external boundaries: LLM provider (recorded fixtures), network, clock, browser audio, and storage failure. Never mock the module under test. The recording event bus in `orchestrator/testing` is an internal real implementation.
- Keep every file under 150 lines.
- Tasks in the web voice, captions, and speech areas are Teammate 1 area, minimal wiring. Each records its touched files for the final summary (Req 16).
- There are no optional tasks. Property tests are required.

## Tasks

- [ ] 1. Contracts
  - [ ] 1.1 Fold in fast-check and the "settings" agent name
    - The working tree already has `fast-check` 4.10.2 in root `devDependencies` (installed with `--save-exact`). Keep it. Reason: property-based tests required by the spec (Req 12.1).
    - The working tree also has "settings" in `agentNames` in `packages/contracts/src/events.ts` and one edited case in `packages/contracts/src/isAssistantEvent.test.ts` (the agent list includes "settings"). Keep both.
    - Red: run `git stash push packages/contracts/src/events.ts` (touch no other file), then `npx vitest run packages/contracts`. Record the red run and confirm the "settings" agent case fails because "settings" is not an agent name.
    - Green: run `git stash pop` to restore the edit, then `npx vitest run packages/contracts` and record green. Confirm the stash list is empty afterwards.
    - Typecheck is expected to be red after this task. Adding "settings" to `agentNames` makes `Record<SubAgentName, AgentDefinition>` in `apps/server/src/orchestrator/agents.ts` incomplete. This is the one allowed exception, and task 1.2 restores green. `npm test` and `npm run lint` must pass.
    - Files: `package.json`, `package-lock.json`, `packages/contracts/src/events.ts`, `packages/contracts/src/isAssistantEvent.test.ts`.
    - Done: `npm test` and `npm run lint` pass; typecheck red only on the missing `settings` entry.
    - _Requirements: 1.6, 12.1_

  - [ ] 1.2 Add the minimal settings entry to agentDefinitions (restores typecheck green; ends the exception)
    - Sits in `apps/server` (Sepehr's orchestrator area). It exists to restore typecheck after task 1.1, and it ends the typecheck exception.
    - Failing tests first, in `apps/server/src/orchestrator/agents.test.ts`: `agentDefinitions` has a `settings` entry; its prompt contains "the user's language" and does not match `/farsi/i`. In the router test file, assert the router enum includes `settings` (`routeRequest` derives the enum from `agentDefinitions`). Run, record red for the expected reason (no `settings` entry).
    - Then add the `settings` entry in `apps/server/src/orchestrator/agents.ts`: a prompt that ends with the standard confirmation line ("...in one short sentence in the user's language, the language the user spoke"), names no language, never assumes the current value, requires absolute values for relative requests, and asks one short question when the setting or value is missing. The tools list is empty for now; tools arrive in task 1.8.
    - Files: `apps/server/src/orchestrator/agents.ts`, `apps/server/src/orchestrator/agents.test.ts`, the router test file next to `routeRequest.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 2.1, 2.5, 5.3, 14.2, 14.3_

  - [ ] 1.3 Add the settingSchemas registry, defaultSettings, and types
    - Failing test first: new `packages/contracts/src/settings.test.ts` asserting the four entries and bounds (speechRate 0.5 to 1.5, captionSize enum small/medium/large/extra-large, highContrast boolean, silenceWaitMs integer 800 to 4000), the defaults (1.0, large, true, 1500), and a fast-check property (at least 100 runs) that every default satisfies its own bounds. Run, record red (module missing).
    - Then create `packages/contracts/src/settings.ts` with `settingSchemas`, `SettingName`, `Settings`, `SettingValue`, `CaptionSize`, and `defaultSettings`, and re-export from `packages/contracts/src/index.ts`.
    - Files: `packages/contracts/src/settings.ts`, `packages/contracts/src/settings.test.ts`, `packages/contracts/src/index.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 12.6_

  - [ ] 1.4 Add isSettingName and isSettingValue with Property 1
    - Failing tests first in new `packages/contracts/src/isSetting.test.ts`: examples for valid and invalid names and values, plus the fast-check test named "Feature: settings-agent, Property 1: Setting value guard matches the registry" (at least 100 runs). The property covers NaN, Infinity, wrong types, out-of-range numbers, non-integers for silenceWaitMs, strings outside the caption sizes, and prototype names such as "toString" and "__proto__" for `isSettingName`. Run, record red (module missing).
    - Then create `packages/contracts/src/isSetting.ts`, derived from `settingSchemas`, using `Object.hasOwn`, `Number.isFinite`, and `Number.isInteger`. Re-export from `index.ts`.
    - Files: `packages/contracts/src/isSetting.ts`, `packages/contracts/src/isSetting.test.ts`, `packages/contracts/src/index.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - **Property 1: Setting value guard matches the registry**
    - **Validates: Requirements 1.1, 1.3, 1.9**
    - _Requirements: 1.3, 1.9, 12.6_

  - [ ] 1.5 Add the setting_changed event and its guard behavior
    - Failing tests first in `packages/contracts/src/isAssistantEvent.test.ts`: the guard accepts a valid `setting_changed` event for each of the four settings; rejects an unknown name, a missing value, and a wrong-typed or out-of-bounds value; rejects null, undefined, non-objects, and missing or unknown `type`; returns false without throwing and without modifying the candidate. Run, record red.
    - Then add `SettingChangedEvent` to `AssistantEvent` in `packages/contracts/src/events.ts` and extend `packages/contracts/src/isAssistantEvent.ts`, using `isSettingName` and `isSettingValue`.
    - Files: `packages/contracts/src/events.ts`, `packages/contracts/src/isAssistantEvent.ts`, `packages/contracts/src/isAssistantEvent.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass. If a `switch` over `AssistantEvent` elsewhere breaks typecheck, add only the minimal case needed to keep it green and list the file in the task notes.
    - _Requirements: 6.1, 6.3, 6.5, 6.6, 6.8_

  - [ ] 1.6 Add the settings_reset event and its guard behavior
    - Failing tests first in `packages/contracts/src/isAssistantEvent.test.ts`: the guard accepts `{ type: "settings_reset" }`. Add a test that it carries no name or value in its type. Run, record red.
    - Then add `SettingsResetEvent` to `AssistantEvent` and extend the guard. Keep typecheck green with minimal changes only if an exhaustive switch elsewhere breaks, and list any such file.
    - Files: `packages/contracts/src/events.ts`, `packages/contracts/src/isAssistantEvent.ts`, `packages/contracts/src/isAssistantEvent.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 6.2, 6.4, 6.8_

  - [ ] 1.7 Add the event JSON round-trip property (Property 2)
    - Failing test first in `packages/contracts/src/isAssistantEvent.test.ts`: "Feature: settings-agent, Property 2: Event guard accepts valid events and rejects invalid ones, with JSON round trip", at least 100 runs. Valid events survive `JSON.parse(JSON.stringify(e))` accepted and deeply equal; invalid candidates are rejected without throwing and without mutation. If it passes on first run, mutate the guard to show red, then restore.
    - Files: `packages/contracts/src/isAssistantEvent.test.ts`; production file only if the property exposes a defect.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - **Property 2: Event guard accepts valid events and rejects invalid ones, with JSON round trip**
    - **Validates: Requirements 6.3, 6.4, 6.5, 6.6, 6.7**
    - _Requirements: 6.7, 12.6, 12.7_

  - [ ] 1.8 Add update_setting and reset_settings tool names, inputs, and the minimal orchestrator wiring
    - This task touches orchestrator files only as needed to keep the build green. Adding to `toolNames` breaks `Record<ToolName, ...>` typing in `apps/server/src/orchestrator/toolSchemas.ts` and `sampleInputs: ToolInputs` in `stubTools.test.ts`, and makes `stubTools` build the new tools.
    - Failing tests first: `packages/contracts/src/isToolName.test.ts` expects both new names and all existing names; a new `toolSchemas` test asserts the `update_setting` schema has required `name` (an enum built from `Object.keys(settingSchemas)`) and required `value` with no type, and the `reset_settings` schema has empty properties; `agents.test.ts` asserts `agentDefinitions.settings.tools` equals `["update_setting", "reset_settings"]`. Run, record red.
    - Then add the names and `ToolInputs` entries (`update_setting: { name; value }`, `reset_settings: Record<string, unknown>`) in `packages/contracts/src/tools.ts`, add the two `toolSchemas` entries, extend `sampleInputs` in `apps/server/src/orchestrator/stubTools.test.ts`, and set the settings agent tools in `agents.ts`.
    - Files: `packages/contracts/src/tools.ts`, `packages/contracts/src/isToolName.test.ts`, `apps/server/src/orchestrator/toolSchemas.ts`, a `toolSchemas` test file, `apps/server/src/orchestrator/stubTools.test.ts`, `apps/server/src/orchestrator/agents.ts`, `apps/server/src/orchestrator/agents.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 1.7, 1.8, 3.2_

- [ ] 2. CHECKPOINT: contract change ready to merge
  - STOP. Do not start task 3 or any later task until the user says to continue.
  - Tell the user the contract change is ready to merge for teammates.
  - List the contract files changed: `packages/contracts/src/events.ts`, `packages/contracts/src/isAssistantEvent.ts`, `packages/contracts/src/isAssistantEvent.test.ts`, `packages/contracts/src/settings.ts`, `packages/contracts/src/settings.test.ts`, `packages/contracts/src/isSetting.ts`, `packages/contracts/src/isSetting.test.ts`, `packages/contracts/src/tools.ts`, `packages/contracts/src/isToolName.test.ts`, `packages/contracts/src/index.ts`. Also list the root `package.json` and `package-lock.json` (fast-check) and the orchestrator files touched only to keep the build green: `agents.ts`, `agents.test.ts`, `toolSchemas.ts`, `stubTools.test.ts`.
  - Confirm `npm test`, `npm run lint`, `npm run typecheck` pass. Wait for the user.

- [ ] 3. Server
  - [ ] 3.1 Derive per-setting schemas with settingToolSchema
    - Failing tests first in new `apps/server/src/settings/settingToolSchema.test.ts`: for each setting name, the derived schema has the right type, `minimum`/`maximum`, or `enum`, and the `allowed` descriptor (`number`/`integer` with min and max, `enum` with values, `boolean`) matches the registry. Also a test that the generated tool description lists the allowed values per name. Run, record red.
    - Then create `apps/server/src/settings/settingToolSchema.ts`, reading only from `settingSchemas`.
    - Files: `apps/server/src/settings/settingToolSchema.ts`, `apps/server/src/settings/settingToolSchema.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 1.4, 3.2_

  - [ ] 3.2 withSettings: valid update_setting emits one setting_changed
    - Failing test first in new `apps/server/src/settings/withSettings.test.ts`, using the real recording bus from `orchestrator/testing`: a valid call emits exactly one `setting_changed` with that name and value and returns `{ ok: true, output: { applied: true, name, value } }`. Run, record red.
    - Then create `apps/server/src/settings/withSettings.ts` following `withContactResolution`.
    - Files: `apps/server/src/settings/withSettings.ts`, `apps/server/src/settings/withSettings.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 3.1, 3.2_

  - [ ] 3.3 withSettings: unknown name returns applied:false
    - Failing test first: an unknown name (including "toString" and "__proto__") returns `{ ok: true, output: { applied: false, error } }` where the error names the unknown name; no event is emitted. Run, record red.
    - Then add the unknown-name branch.
    - Files: `apps/server/src/settings/withSettings.ts`, `apps/server/src/settings/withSettings.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 3.3_

  - [ ] 3.4 withSettings: out-of-range value returns applied:false with the range
    - Failing test first: speechRate 2 and silenceWaitMs 100 return `applied: false` with an `allowed` descriptor stating min and max and an error mentioning them; no event. Run, record red.
    - Then add the bounds branch using `settingToolSchema` and `validateToolInput`.
    - Files: `apps/server/src/settings/withSettings.ts`, `apps/server/src/settings/withSettings.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 3.4_

  - [ ] 3.5 withSettings: wrong type or enum value returns applied:false
    - Failing test first: captionSize "huge", highContrast "yes", speechRate "fast", silenceWaitMs 1500.5, NaN, and Infinity each return `applied: false` with an error stating the expected type or listing the allowed enum values; no event. Run, record red.
    - Then add the type/enum branch with `isSettingValue` as the final authority.
    - Files: `apps/server/src/settings/withSettings.ts`, `apps/server/src/settings/withSettings.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 3.5_

  - [ ] 3.6 Update tool property: event if and only if valid (Property 8)
    - Failing test first: "Feature: settings-agent, Property 8: Update tool emits one event if and only if input is valid", at least 100 runs, over arbitrary names and values. Valid input emits exactly one matching event; otherwise zero events and `applied: false`. If it passes on first run, mutate the wrapper to show red, then restore.
    - Files: `apps/server/src/settings/withSettings.test.ts`; production only if a defect appears. Split the test file if it nears 150 lines.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - **Property 8: Update tool emits one event if and only if input is valid**
    - **Validates: Requirements 3.1, 3.3, 3.4, 3.5**
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 12.6_

  - [ ] 3.7 withSettings: reset_settings emits one settings_reset
    - Failing test first: calling `reset_settings` with `{}` and with `{ junk: 1 }` each emits exactly one `settings_reset` and returns `{ ok: true }`. Run, record red.
    - Then add the reset tool to the wrapper.
    - Files: `apps/server/src/settings/withSettings.ts`, `apps/server/src/settings/withSettings.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 4.1, 4.4_

  - [ ] 3.8 Reset tool ignores input (Property 9)
    - Failing test first: "Feature: settings-agent, Property 9: Reset tool ignores input", at least 100 runs over arbitrary objects. Exactly one `settings_reset` is emitted and the result succeeds. If it passes on first run, mutate the wrapper to show red, then restore.
    - Files: `apps/server/src/settings/withSettings.test.ts` (split if near 150 lines).
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - **Property 9: Reset tool ignores input**
    - **Validates: Requirements 4.1, 4.4**
    - _Requirements: 4.1, 4.4, 12.6_

  - [ ] 3.9 Compose withSettings in app.ts
    - Decision: test the composition at the `createApp` level through the HTTP `/request` route, using the replay/LLM injection already available through `LlmClientOptions`, with a small scripted conversation defined inline in the test (router selects settings, `update_setting`, final text). Read events from `/events` or the hub. This is not redundant with the fixtures group: it proves the wrapper is composed in the real app with a minimal inline script, while the fixtures group proves the shipped Farsi recordings and the no-API-key selection. If `LlmClientOptions` offers no way to inject a scripted client, instead do an orchestrator-level test with the real hub and the same inline script, and leave end-to-end proof to tasks 6.3 and 6.4. Record which path was taken.
    - Failing test first: the scripted request produces a `setting_changed` event on the hub. Run, record red (the stub tool's plain output emits no event).
    - Then change `apps/server/src/app.ts` to `withSettings(withContactResolution(createStubTools().tools, fixtureContacts), hub)`.
    - Files: `apps/server/src/app.ts`, a new or existing app/integration test file.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 3.1, 13.5_

  - [ ] 3.10 Router: settings description and clarifier sentence
    - Failing tests first: the router system prompt built by `routeRequest.ts` mentions settings (speech rate, caption size, contrast, silence wait, restoring normal), names no language (`/farsi/i` does not match), and contains the sentence routing mixed settings plus comms/home/media intents, and unclear settings intents, to the clarifier. Add an orchestrator test where a recorded routing response selecting `settings` reaches the settings agent. Run, record red.
    - Then edit the description and prompt in `apps/server/src/orchestrator/routeRequest.ts`.
    - Files: `apps/server/src/orchestrator/routeRequest.ts` and its test file, `apps/server/src/orchestrator/orchestrator.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ] 3.11 runSubAgent: applied:false does not fail the run
    - Test first in `apps/server/src/orchestrator/orchestrator.test.ts`, using an inline recorded conversation with the real `withSettings` wrapper and recording bus: `update_setting` with an out-of-range value returns `applied: false`; the run does not fail; the model's final text becomes the reply; no `setting_changed` event is emitted and no success confirmation is produced.
    - This is derived from the wrapper behavior in tasks 3.4 and 3.5. No new production code is expected. If the test passes on first run, say so in the task notes and treat it as a regression guard, then prove it can fail by temporarily making the wrapper return `{ ok: false }` (record red) and restoring (record green). If it fails for any other reason, fix `runSubAgent` minimally.
    - Files: `apps/server/src/orchestrator/orchestrator.test.ts`; `runSubAgent.ts` only if needed.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 3.6, 5.4_

- [ ] 4. Web store
  - [ ] 4.1 applyEvent: a valid setting_changed updates only that field
    - Failing test first in new `apps/web/src/settings/applyEvent.test.ts`: for a `setting_changed` event, the returned state has the new value for that setting and the other three unchanged. Run, record red (module missing).
    - Then create `apps/web/src/settings/applyEvent.ts` (pure reducer, using `isSettingName` and `isSettingValue`).
    - Files: `apps/web/src/settings/applyEvent.ts`, `apps/web/src/settings/applyEvent.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 7.2_

  - [ ] 4.2 applyEvent: settings_reset returns the defaults
    - Failing test first: from a non-default state and from the default state, `settings_reset` yields `defaultSettings` with no error. Run, record red.
    - Then add the reset branch.
    - Files: `apps/web/src/settings/applyEvent.ts`, `apps/web/src/settings/applyEvent.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 4.2, 4.3_

  - [ ] 4.3 applyEvent: invalid or unrelated events return the same reference
    - Failing test first: unknown name, NaN, Infinity, wrong type, out-of-bounds value, a captionSize outside the sizes, and an unrelated event (for example `speech`) each return the identical state reference. Run, record red.
    - Then add the guard branch.
    - Files: `apps/web/src/settings/applyEvent.ts`, `apps/web/src/settings/applyEvent.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 7.3_

  - [ ] 4.4 Bounds under any event sequence (Property 3)
    - Failing test first: "Feature: settings-agent, Property 3: Settings stay within bounds under any event sequence", at least 100 runs, sequences of 0 to 50 events mixing in-bounds values, out-of-bounds values, and unknown names; every setting satisfies `isSettingValue` after each event. If it passes on first run, mutate the reducer to show red, then restore.
    - Files: `apps/web/src/settings/applyEvent.property.test.ts` (new, keeps files short).
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - **Property 3: Settings stay within bounds under any event sequence**
    - **Validates: Requirements 7.2, 7.5, 12.2**
    - _Requirements: 7.5, 12.2, 12.6_

  - [ ] 4.5 Invalid events leave state unchanged (Property 4)
    - Failing test first: "Feature: settings-agent, Property 4: Invalid events leave state unchanged", at least 100 runs, over any valid state and any event with an unknown name or invalid value (including NaN, Infinity, wrong types); result deeply equals the prior state. If it passes on first run, mutate to show red, then restore.
    - Files: `apps/web/src/settings/applyEvent.property.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - **Property 4: Invalid events leave state unchanged**
    - **Validates: Requirements 7.3, 12.4**
    - _Requirements: 7.3, 12.4, 12.6_

  - [ ] 4.6 Reset yields defaults and is idempotent (Property 5)
    - Failing test first: "Feature: settings-agent, Property 5: Reset yields defaults and is idempotent", at least 100 runs, over any valid state; one reset yields `defaultSettings` and a second yields the same. If it passes on first run, mutate to show red, then restore.
    - Files: `apps/web/src/settings/applyEvent.property.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - **Property 5: Reset yields defaults and is idempotent**
    - **Validates: Requirements 4.2, 4.3, 12.3**
    - _Requirements: 4.2, 4.3, 12.3, 12.6_

  - [ ] 4.7 loadSettings with per-field fallback
    - Failing tests first in new `apps/web/src/settings/settingsStorage.test.ts`: no saved value gives the defaults; a valid saved state is returned; one invalid field falls back to its default while other valid fields are kept; unparseable JSON, empty string, and non-object JSON (array, number, string, boolean, null) give the defaults; a storage that throws on read gives the defaults and leaves stored values unmodified. The throwing storage is an external boundary fake. Run, record red.
    - Then create `apps/web/src/settings/settingsStorage.ts` with key `yazd.settings` and `loadSettings` inside try/catch.
    - Files: `apps/web/src/settings/settingsStorage.ts`, `apps/web/src/settings/settingsStorage.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 7.1, 7.6, 7.7, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ] 4.8 Load falls back per field (Property 7)
    - Failing test first: "Feature: settings-agent, Property 7: Load falls back per field", at least 100 runs, over arbitrary stored strings and partially valid objects; `loadSettings` never throws and each field equals the stored value when `isSettingValue` accepts it, else the default. If it passes on first run, mutate to show red, then restore.
    - Files: `apps/web/src/settings/settingsStorage.property.test.ts` (new).
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - **Property 7: Load falls back per field**
    - **Validates: Requirements 7.1, 7.6, 8.4, 8.5, 8.6**
    - _Requirements: 7.1, 7.6, 8.4, 8.5, 8.6, 12.6_

  - [ ] 4.9 saveSettings returns false when the write throws
    - Failing tests first in `settingsStorage.test.ts`: a successful save writes the complete state as JSON under `yazd.settings` and returns true; a storage whose `setItem` throws makes `saveSettings` return false without throwing. Run, record red.
    - Then add `saveSettings` inside try/catch.
    - Files: `apps/web/src/settings/settingsStorage.ts`, `apps/web/src/settings/settingsStorage.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 8.1, 8.7_

  - [ ] 4.10 Persistence round trip (Property 6)
    - Failing test first: "Feature: settings-agent, Property 6: Persistence round trip", at least 100 runs, using happy-dom `localStorage`; save then load yields a state deeply equal to the original. If it passes on first run, mutate to show red, then restore.
    - Files: `apps/web/src/settings/settingsStorage.dom.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - **Property 6: Persistence round trip**
    - **Validates: Requirements 8.8, 12.5**
    - _Requirements: 8.8, 12.5, 12.6_

  - [ ] 4.11 createSettingsStore: initial state from storage
    - Failing tests first in new `apps/web/src/settings/settingsStore.dom.test.ts`: right after `createSettingsStore` returns, `get()` equals the loaded state (defaults when storage is empty, unavailable, or null). Use happy-dom `localStorage` and an in-memory event source. Run, record red.
    - Then create `apps/web/src/settings/settingsStore.ts`.
    - Files: `apps/web/src/settings/settingsStore.ts`, `apps/web/src/settings/settingsStore.dom.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 7.1, 7.7, 8.2, 9.7, 9.8_

  - [ ] 4.12 createSettingsStore: subscribes to the event source itself
    - Failing test first: with no surface mounted, a `setting_changed` event pushed on the event source changes `get()`; after `dispose()` further events are ignored. Run, record red.
    - Then wire the event subscription and `dispose`.
    - Files: `apps/web/src/settings/settingsStore.ts`, `apps/web/src/settings/settingsStore.dom.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 7.2_

  - [ ] 4.13 createSettingsStore: notify once per change, never on invalid
    - Failing tests first: a valid change notifies each subscriber exactly once, synchronously, with the new state; an invalid event, an unrelated event, and an unchanged-by-reset-to-defaults event notify no one; an unsubscribed listener is not called. Run, record red.
    - Then add `subscribe` and reference-change notification.
    - Files: `apps/web/src/settings/settingsStore.ts`, `apps/web/src/settings/settingsStore.dom.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 7.3, 7.4_

  - [ ] 4.14 createSettingsStore: persists on every change
    - Failing test first: after a valid change, `localStorage` holds the complete state under `yazd.settings`; a new store created over the same storage starts with that state; after a reset, storage holds the defaults. Run, record red.
    - Then add the write on change.
    - Files: `apps/web/src/settings/settingsStore.ts`, `apps/web/src/settings/settingsStore.dom.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 8.1, 8.2_

  - [ ] 4.15 createSettingsStore: keeps state when a write throws and retries on the next change
    - Failing test first, using a storage fake whose `setItem` throws once (external boundary fake): the in-memory state still updates and subscribers are notified; the next change attempts the write again and succeeds. Run, record red.
    - Then use the `saveSettings` boolean result so a failed write never blocks state.
    - Files: `apps/web/src/settings/settingsStore.ts`, `apps/web/src/settings/settingsStore.dom.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 8.7, 7.7_

  - [ ] 4.16 Add the strings.settings group
    - Placed here with the web tasks because `describeEvent` is its first consumer; nothing in contracts or server needs it.
    - Failing test first in the strings package test file: `strings.settings` has display names for all four settings (keyed by `SettingName`), activity templates for changed and reset, and value labels (on/off). Add a test that every string key is unique and has exactly one value. Run, record red.
    - Then add the group to `packages/strings/src/strings.ts`.
    - Files: `packages/strings/src/strings.ts`, the strings test file.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 11.1, 11.3_

  - [ ] 4.17 describeEvent: setting_changed
    - Failing test first in `apps/web/src/activity/describeEvent.test.ts`, using the real strings package: the result is one non-empty string containing the setting name and value, and uses text from `strings.settings`. Run, record red.
    - Then add the case in `apps/web/src/activity/describeEvent.ts`.
    - Files: `apps/web/src/activity/describeEvent.ts`, `apps/web/src/activity/describeEvent.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 10.1, 11.2, 11.4_

  - [ ] 4.18 describeEvent: settings_reset
    - Failing test first: the result is one non-empty string stating that settings were reset, from `strings.settings`. Run, record red.
    - Then add the case.
    - Files: `apps/web/src/activity/describeEvent.ts`, `apps/web/src/activity/describeEvent.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 10.2, 11.2, 11.4_

  - [ ] 4.19 Activity description names the change (Property 10)
    - Failing test first: "Feature: settings-agent, Property 10: Activity description names the change", at least 100 runs, over valid `setting_changed` events; the result is non-empty and contains the name and value. If it passes on first run, mutate to show red, then restore.
    - Files: `apps/web/src/activity/describeEvent.test.ts` (split if near 150 lines).
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - **Property 10: Activity description names the change**
    - **Validates: Requirements 10.1, 10.2**
    - _Requirements: 10.1, 10.2, 12.6_

- [ ] 5. Surfaces (Teammate 1 area, minimal wiring)
  - [ ] 5.1 Provide the settings store through SurfaceContext (Teammate 1 area, minimal wiring)
    - Failing test first: a surface mounted with the test context reads `context.settings.get()` equal to `defaultSettings`. Run, record red.
    - Then add `settings: SettingsStore` to `SurfaceContext` in `apps/web/src/surfaces/surface.ts`; make `apps/web/src/testing/testContext.ts` provide a real store over in-memory storage; make `apps/web/src/main.ts` create the store, subscribe it to the live event source, and pass it to the player and the context.
    - Touched files to record: `apps/web/src/surfaces/surface.ts`, `apps/web/src/testing/testContext.ts`, `apps/web/src/main.ts` and the new test file `apps/web/src/settings/settingsContext.dom.test.ts` that holds the red test.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 9.7, 9.8, 16.1, 16.2_

  - [ ] 5.2 Speech player plays through one audio element and the analyser (Teammate 1 area, minimal wiring)
    - Failing tests first in `apps/web/src/speech/speechPlayer.test.ts`, with fakes for the audio element factory and `PlaybackContext.createMediaElementSource` (external boundaries): the player creates one `HTMLAudioElement` and one `MediaElementAudioSourceNode` at construction, connected to the analyser; each clip plays through the same element; `frame()` returns null when idle and a frame while playing; latest-wins ticket logic and stop-previous behavior are preserved; `dispose` releases resources. Update existing fakes accordingly. Run, record red.
    - Then replace `decodeAudioData` and `createBufferSource` with the audio element path in `apps/web/src/speech/speechPlayer.ts`.
    - Touched files to record: `apps/web/src/speech/speechPlayer.ts`, `apps/web/src/speech/speechPlayer.test.ts`, and any `PlaybackContext` type file.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 9.9, 16.1, 16.2_

  - [ ] 5.3 Speech player applies preservesPitch and the rate before each clip (Teammate 1 area, minimal wiring)
    - Failing tests first: before each clip the element has `preservesPitch === true` and `playbackRate === store.get().speechRate`; after a store change to 0.8, the next clip starts at 0.8 while a clip already playing keeps its previous rate. Run, record red.
    - Then set both properties before each play in `speechPlayer.ts`, reading the store.
    - Touched files to record: `apps/web/src/speech/speechPlayer.ts`, `apps/web/src/speech/speechPlayer.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 9.1, 16.1, 16.2_

  - [ ] 5.4 Reset applies the default rate to the next clip (Teammate 1 area, minimal wiring)
    - Failing test first: after a rate change to 0.8 and a `settings_reset` event, the next clip uses `defaultSettings.speechRate`, and a clip already playing is not altered. Run, record red. If this passes without new code, say so and show red by mutation before keeping it as a guard.
    - Touched files to record: `apps/web/src/speech/speechPlayer.ts` (only if needed), `apps/web/src/speech/speechPlayer.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 9.6, 16.1, 16.2_

  - [ ] 5.5 Captions follow caption size and contrast live (Teammate 1 area, minimal wiring)
    - Failing tests first in `apps/web/src/captions/captionsSurface.dom.test.ts` (happy-dom): the host has `data-caption-size` and `data-contrast` matching the store at mount; changing either setting updates the attributes immediately while existing caption blocks are on screen; later captions render under the new attributes; a reset restores defaults. Run, record red.
    - Then subscribe to the store in `apps/web/src/captions/captionsSurface.ts` and set the attributes.
    - Touched files to record: `apps/web/src/captions/captionsSurface.ts`, `apps/web/src/captions/captionsSurface.dom.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 9.2, 9.3, 9.6, 9.7, 9.8, 16.1, 16.2_

  - [ ] 5.6 CSS for four caption sizes and two contrast modes (Teammate 1 area, minimal wiring)
    - Failing test first: a test reads `apps/web/index.html` and asserts selectors exist for each of the four `data-caption-size` values and both `data-contrast` modes, and that the default selectors match the current look values. Run, record red.
    - Then add the CSS to `apps/web/index.html`, with defaults matching the existing look. The visual result is verified by eye and noted as such; the test only proves the selectors exist.
    - Touched files to record: `apps/web/index.html` and the test file.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 9.2, 9.3, 16.1, 16.2_

  - [ ] 5.7 Voice surface reads silenceWaitMs at utterance start (Teammate 1 area, minimal wiring)
    - Failing tests first in `apps/web/src/voice/voiceSurface.dom.test.ts`, with the fake clock as an external boundary: an utterance started after the setting is 3000 uses a 3000 ms silence timeout; a change during an utterance leaves that utterance on its previous timeout and applies to the next one; a reset applies the default to the next utterance. Run, record red.
    - Then read `store.get().silenceWaitMs` when an utterance begins in `apps/web/src/voice/voiceSurface.ts` and pass it to `createSilenceDetector`.
    - Touched files to record: `apps/web/src/voice/voiceSurface.ts`, `apps/web/src/voice/voiceSurface.dom.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 9.4, 9.5, 9.6, 9.7, 16.1, 16.2_

  - [ ] 5.8 Remove silenceTimeoutMs from voiceConfig (Teammate 1 area, minimal wiring)
    - Failing test first: update `apps/web/src/voice/voiceConfig.test.ts` so it no longer expects `silenceTimeoutMs` and asserts the config has no such export, with `noSpeechTimeoutMs` and `silenceThreshold` unchanged. This is a required test change, because the constant is removed by design (Req 9.4); it is not a test weakened to pass. State this in the task notes. Run, record red (the constant still exists).
    - Then remove the constant from `apps/web/src/voice/voiceConfig.ts` and fix any remaining reference.
    - Touched files to record: `apps/web/src/voice/voiceConfig.ts`, `apps/web/src/voice/voiceConfig.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 1.4, 9.4, 16.1, 16.2_

- [ ] 6. Fixtures
  - [ ] 6.1 Replay the Farsi "speak slower" fixture
    - Failing test first in new `apps/server/src/settings/settingsReplay.test.ts`: replay `speakSlower.json` through the real orchestrator with `createStubTools` wrapped by `withSettings` and the recording bus. Assert routing to `settings`, a `setting_changed` event with `speechRate` below 1.0, and the reply equal to the last text block. Run, record red (fixture missing).
    - Then create `apps/server/src/orchestrator/fixtures/speakSlower.json`: transcript is the Persian phrase for "speak slower" in Farsi script; recorded responses are router to `settings`, `update_setting` with `speechRate` 0.8, and a one-sentence Farsi confirmation.
    - Files: `apps/server/src/orchestrator/fixtures/speakSlower.json`, `apps/server/src/settings/settingsReplay.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 15.1, 15.3, 15.6_

  - [ ] 6.2 Replay the Farsi "go back to normal" fixture
    - Failing test first in `settingsReplay.test.ts`: replay `resetSettings.json` the same way and assert routing to `settings`, a `settings_reset` event, and the reply equal to the last text block. Run, record red (fixture missing).
    - Then create `apps/server/src/orchestrator/fixtures/resetSettings.json`: transcript is the Persian phrase for "go back to normal" in Farsi script; router to `settings`, `reset_settings`, and a one-sentence Farsi confirmation.
    - Files: `apps/server/src/orchestrator/fixtures/resetSettings.json`, `apps/server/src/settings/settingsReplay.test.ts` (split if near 150 lines).
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 15.2, 15.4, 15.6_

  - [ ] 6.3 Register "speak slower" and prove it end to end without an API key
    - Failing test first in `apps/server/src/integration.test.ts` style: `createApp({})` with no `OPENROUTER_API_KEY` receives the Farsi "speak slower" transcript at `/request`, and `/events` yields a `setting_changed` event with `speechRate` below 1.0. Run, record red (no registered conversation).
    - Then register the fixture in `apps/server/src/llm/replayConversations.ts`.
    - Files: `apps/server/src/llm/replayConversations.ts`, a new `apps/server/src/settings/settingsApp.test.ts` (or the integration test file if short enough).
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 15.5, 15.1, 15.3_

  - [ ] 6.4 Register "go back to normal" and prove it end to end without an API key
    - Failing test first in the same e2e test file: the Farsi "go back to normal" transcript posted to `/request` on `createApp({})` yields a `settings_reset` event on `/events`. Run, record red.
    - Then register the second fixture in `replayConversations.ts`.
    - Files: `apps/server/src/llm/replayConversations.ts`, the e2e test file.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 15.5, 15.2, 15.4_

- [ ] 7. Final verification
  - [ ] 7.1 Run the full checks and the comment audit
    - Run `npm test`, `npm run lint`, and `npm run typecheck`; all must pass.
    - Search the diff for added code comments in changed files (for example `git diff -U0 | grep -E '^\+\s*(//|/\*|\*)'` and a check of untracked files). Fix any hit and re-run all checks.
    - Confirm every changed or new file is under 150 lines.
    - Confirm `git status` shows `KIRO_LOG.md` and `.env.example` were not touched by this work.
    - Files: none expected unless the audit finds a violation.
    - Done: all three commands pass and the audit is clean.
    - _Requirements: 13.1, 13.3, 13.5, 13.6_

  - [ ] 7.2 Produce the final summary
    - List every touched file in the apps/web voice, captions, and speech areas (Teammate 1 area), as recorded in tasks 5.1 to 5.8 (Req 16.3).
    - List every file touched outside the planned set in the design's file table.
    - State the known limitation: the server keeps no settings state, so relative requests are resolved to absolute values (Req 14).
    - Confirm `KIRO_LOG.md` and `.env.example` were not touched.
    - Remind the user that nothing was committed.
    - Files: none.
    - Done: summary delivered to the user.
    - _Requirements: 14.1, 14.4, 16.3_

## Notes

- The only allowed typecheck-red window is between task 1.1 and task 1.2.
- Task 2 is a hard stop. Do not continue past it until the user says so.
- Each property test is its own task and is tagged with its property number and requirement clauses.
- Property tests that pass on first run are shown red by temporary mutation, then restored.
- `KIRO_LOG.md` and `.env.example` must stay untouched. Do not commit.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["1.4"] },
    { "id": 4, "tasks": ["1.5"] },
    { "id": 5, "tasks": ["1.6"] },
    { "id": 6, "tasks": ["1.7"] },
    { "id": 7, "tasks": ["1.8"] },
    { "id": 8, "tasks": ["3.1"] },
    { "id": 9, "tasks": ["3.2"] },
    { "id": 10, "tasks": ["3.3"] },
    { "id": 11, "tasks": ["3.4"] },
    { "id": 12, "tasks": ["3.5"] },
    { "id": 13, "tasks": ["3.6"] },
    { "id": 14, "tasks": ["3.7"] },
    { "id": 15, "tasks": ["3.8"] },
    { "id": 16, "tasks": ["3.9"] },
    { "id": 17, "tasks": ["3.10"] },
    { "id": 18, "tasks": ["3.11"] },
    { "id": 19, "tasks": ["4.1"] },
    { "id": 20, "tasks": ["4.2"] },
    { "id": 21, "tasks": ["4.3"] },
    { "id": 22, "tasks": ["4.4"] },
    { "id": 23, "tasks": ["4.5"] },
    { "id": 24, "tasks": ["4.6"] },
    { "id": 25, "tasks": ["4.7"] },
    { "id": 26, "tasks": ["4.8"] },
    { "id": 27, "tasks": ["4.9"] },
    { "id": 28, "tasks": ["4.10"] },
    { "id": 29, "tasks": ["4.11"] },
    { "id": 30, "tasks": ["4.12"] },
    { "id": 31, "tasks": ["4.13"] },
    { "id": 32, "tasks": ["4.14"] },
    { "id": 33, "tasks": ["4.15"] },
    { "id": 34, "tasks": ["4.16"] },
    { "id": 35, "tasks": ["4.17"] },
    { "id": 36, "tasks": ["4.18"] },
    { "id": 37, "tasks": ["4.19"] },
    { "id": 38, "tasks": ["5.1"] },
    { "id": 39, "tasks": ["5.2"] },
    { "id": 40, "tasks": ["5.3"] },
    { "id": 41, "tasks": ["5.4"] },
    { "id": 42, "tasks": ["5.5"] },
    { "id": 43, "tasks": ["5.6"] },
    { "id": 44, "tasks": ["5.7"] },
    { "id": 45, "tasks": ["5.8"] },
    { "id": 46, "tasks": ["6.1"] },
    { "id": 47, "tasks": ["6.2"] },
    { "id": 48, "tasks": ["6.3"] },
    { "id": 49, "tasks": ["6.4"] },
    { "id": 50, "tasks": ["7.1"] },
    { "id": 51, "tasks": ["7.2"] }
  ]
}
```
