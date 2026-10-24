# Implementation Plan: Settings Agent

## Overview

Implementation language is TypeScript, as used in the design. Order of groups: contracts, checkpoint, server, web store, surfaces, fixtures, final verification.

Rules that apply to every task:

- Red/green TDD, one behavior per task. Write the failing test first, run it, record the red output, and confirm it fails for the expected reason (not a syntax error or missing import unrelated to the behavior). Then write the minimum code and run again for green. Refactor steps run only with all tests green.
- Property tests are written first against a missing function or module; that failing run is the red run. Do not mutate production code to show red.
- Every task ends with `npm test`, `npm run lint`, and `npm run typecheck` all passing. The only exception: typecheck is expected to be red after task 1.1 and is restored to green by task 1.2. Nothing else may end red.
- Never touch `KIRO_LOG.md` or `.env.example`.
- Do not commit. The user commits.
- No code comments in any code, new or modified.
- Mocks and fakes only at external boundaries: LLM provider (recorded fixtures), network, clock, browser audio, and storage failure. Never mock the module under test. The recording event bus in `orchestrator/testing` is an internal real implementation.
- Keep every file under 150 lines.
- Tasks in the web voice, captions, and speech areas are Teammate 1 area, minimal wiring. Each records its touched files for the final summary (Req 16).
- There are no optional tasks. Property tests are required.

## Tasks

- [x] 1. Contracts
  - [x] 1.1 Fold in fast-check and the "settings" agent name
    - The working tree already has `fast-check` 4.10.2 in root `devDependencies` (installed with `--save-exact`). Keep it. Reason: property-based tests required by the spec (Req 12.1).
    - The working tree also has "settings" in `agentNames` in `packages/contracts/src/events.ts` and one edited case in `packages/contracts/src/isAssistantEvent.test.ts` (the agent list includes "settings"). Keep both.
    - Red: run `git stash push packages/contracts/src/events.ts` (touch no other file), then `npx vitest run packages/contracts`. Record the red run and confirm the "settings" agent case fails because "settings" is not an agent name.
    - Green: run `git stash pop` to restore the edit, then `npx vitest run packages/contracts` and record green. Confirm the stash list is empty afterwards.
    - Typecheck is expected to be red after this task. Adding "settings" to `agentNames` makes `Record<SubAgentName, AgentDefinition>` in `apps/server/src/orchestrator/agents.ts` incomplete. This is the one allowed exception, and task 1.2 restores green. `npm test` and `npm run lint` must pass.
    - Files: `package.json`, `package-lock.json`, `packages/contracts/src/events.ts`, `packages/contracts/src/isAssistantEvent.test.ts`.
    - Done: `npm test` and `npm run lint` pass; typecheck red only on the missing `settings` entry.
    - _Requirements: 1.6, 12.1_

  - [x] 1.2 Add the minimal settings entry to agentDefinitions (restores typecheck green; ends the exception)
    - Sits in `apps/server` (Sepehr's orchestrator area). It exists to restore typecheck after task 1.1, and it ends the typecheck exception.
    - Failing tests first, in `apps/server/src/orchestrator/agents.test.ts`: `agentDefinitions` has a `settings` entry; its prompt contains "the user's language" and does not match `/farsi/i`. In the router test file, assert the router enum includes `settings` (`routeRequest` derives the enum from `agentDefinitions`). Run, record red for the expected reason (no `settings` entry).
    - Then add the `settings` entry in `apps/server/src/orchestrator/agents.ts`: a prompt that ends with the standard confirmation line ("...in one short sentence in the user's language, the language the user spoke"), names no language, never assumes the current value, requires absolute values for relative requests, and asks one short question when the setting or value is missing. The tools list is empty for now; tools arrive in task 1.8.
    - Files: `apps/server/src/orchestrator/agents.ts`, `apps/server/src/orchestrator/agents.test.ts`, the router test file next to `routeRequest.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 2.1, 2.5, 5.3, 14.2, 14.3_

  - [x] 1.3 Add the settingSchemas registry, defaultSettings, and types
    - Failing test first: new `packages/contracts/src/settings.test.ts` asserting the four entries and bounds (speechRate 0.5 to 1.5, captionSize enum small/medium/large/extra-large, highContrast boolean, silenceWaitMs integer 800 to 4000), the defaults (1.0, large, true, 1500), and a fast-check property (at least 100 runs) that every default satisfies its own bounds. Run, record red (module missing).
    - Then create `packages/contracts/src/settings.ts` with `settingSchemas`, `SettingName`, `Settings`, `SettingValue`, `CaptionSize`, and `defaultSettings`, and re-export from `packages/contracts/src/index.ts`.
    - Files: `packages/contracts/src/settings.ts`, `packages/contracts/src/settings.test.ts`, `packages/contracts/src/index.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 12.6_

  - [x] 1.4 Add isSettingName and isSettingValue with Property 1
    - Failing tests first in new `packages/contracts/src/isSetting.test.ts`: examples for valid and invalid names and values, plus the fast-check test named "Feature: settings-agent, Property 1: Setting value guard matches the registry" (at least 100 runs). The property covers NaN, Infinity, wrong types, out-of-range numbers, non-integers for silenceWaitMs, strings outside the caption sizes, and prototype names such as "toString" and "__proto__" for `isSettingName`. Run, record red (module missing).
    - Then create `packages/contracts/src/isSetting.ts`, derived from `settingSchemas`, using `Object.hasOwn`, `Number.isFinite`, and `Number.isInteger`. Re-export from `index.ts`.
    - Files: `packages/contracts/src/isSetting.ts`, `packages/contracts/src/isSetting.test.ts`, `packages/contracts/src/index.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - **Property 1: Setting value guard matches the registry**
    - **Validates: Requirements 1.1, 1.3, 1.9**
    - _Requirements: 1.3, 1.9, 12.6_

  - [x] 1.5 Add the setting_changed event and its guard behavior
    - Failing tests first in `packages/contracts/src/isAssistantEvent.test.ts`: the guard accepts a valid `setting_changed` event for each of the four settings; rejects an unknown name, a missing value, and a wrong-typed or out-of-bounds value; rejects null, undefined, non-objects, and missing or unknown `type`; returns false without throwing and without modifying the candidate. Run, record red.
    - Then add `SettingChangedEvent` to `AssistantEvent` in `packages/contracts/src/events.ts` and extend `packages/contracts/src/isAssistantEvent.ts`, using `isSettingName` and `isSettingValue`.
    - Files: `packages/contracts/src/events.ts`, `packages/contracts/src/isAssistantEvent.ts`, `packages/contracts/src/isAssistantEvent.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass. If a `switch` over `AssistantEvent` elsewhere breaks typecheck, add only the minimal case needed to keep it green and list the file in the task notes.
    - _Requirements: 6.1, 6.3, 6.5, 6.6, 6.8_

  - [x] 1.6 Add the settings_reset event and its guard behavior
    - Failing tests first in `packages/contracts/src/isAssistantEvent.test.ts`: the guard accepts `{ type: "settings_reset" }`. Add a test that it carries no name or value in its type. Run, record red.
    - Then add `SettingsResetEvent` to `AssistantEvent` and extend the guard. Keep typecheck green with minimal changes only if an exhaustive switch elsewhere breaks, and list any such file.
    - Files: `packages/contracts/src/events.ts`, `packages/contracts/src/isAssistantEvent.ts`, `packages/contracts/src/isAssistantEvent.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 6.2, 6.4, 6.8_

  - [x] 1.7 Add the event JSON round-trip property (Property 2)
    - Failing test first in `packages/contracts/src/isAssistantEvent.test.ts`: "Feature: settings-agent, Property 2: Event guard accepts valid events and rejects invalid ones, with JSON round trip", at least 100 runs. Valid events survive `JSON.parse(JSON.stringify(e))` accepted and deeply equal; invalid candidates are rejected without throwing and without mutation. If it passes on first run, mutate the guard to show red, then restore.
    - Files: `packages/contracts/src/isAssistantEvent.test.ts`; production file only if the property exposes a defect.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - **Property 2: Event guard accepts valid events and rejects invalid ones, with JSON round trip**
    - **Validates: Requirements 6.3, 6.4, 6.5, 6.6, 6.7**
    - _Requirements: 6.7, 12.6, 12.7_

  - [x] 1.8 Add update_setting and reset_settings tool names, inputs, and the minimal orchestrator wiring
    - This task touches orchestrator files only as needed to keep the build green. Adding to `toolNames` breaks `Record<ToolName, ...>` typing in `apps/server/src/orchestrator/toolSchemas.ts` and `sampleInputs: ToolInputs` in `stubTools.test.ts`, and makes `stubTools` build the new tools.
    - Failing tests first: `packages/contracts/src/isToolName.test.ts` expects both new names and all existing names; a new `toolSchemas` test asserts the `update_setting` schema has required `name` (an enum built from `Object.keys(settingSchemas)`) and required `value` with no type, and the `reset_settings` schema has empty properties; `agents.test.ts` asserts `agentDefinitions.settings.tools` equals `["update_setting", "reset_settings"]`. Run, record red.
    - Then add the names and `ToolInputs` entries (`update_setting: { name; value }`, `reset_settings: Record<string, unknown>`) in `packages/contracts/src/tools.ts`, add the two `toolSchemas` entries, extend `sampleInputs` in `apps/server/src/orchestrator/stubTools.test.ts`, and set the settings agent tools in `agents.ts`.
    - Files: `packages/contracts/src/tools.ts`, `packages/contracts/src/isToolName.test.ts`, `apps/server/src/orchestrator/toolSchemas.ts`, a `toolSchemas` test file, `apps/server/src/orchestrator/stubTools.test.ts`, `apps/server/src/orchestrator/agents.ts`, `apps/server/src/orchestrator/agents.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 1.7, 1.8, 3.2_

- [x] 2. CHECKPOINT: contract change ready to merge
  - STOP. Do not start task 3 or any later task until the user says to continue.
  - Tell the user the contract change is ready to merge for teammates.
  - List the contract files changed: `packages/contracts/src/events.ts`, `packages/contracts/src/isAssistantEvent.ts`, `packages/contracts/src/isAssistantEvent.test.ts`, `packages/contracts/src/settings.ts`, `packages/contracts/src/settings.test.ts`, `packages/contracts/src/isSetting.ts`, `packages/contracts/src/isSetting.test.ts`, `packages/contracts/src/tools.ts`, `packages/contracts/src/isToolName.test.ts`, `packages/contracts/src/index.ts`. Also list the root `package.json` and `package-lock.json` (fast-check) and the orchestrator files touched only to keep the build green: `agents.ts`, `agents.test.ts`, `toolSchemas.ts`, `stubTools.test.ts`.
  - Confirm `npm test`, `npm run lint`, `npm run typecheck` pass. Wait for the user.


- [x] 3. Server
  - [x] 3.1 settingToolSchema and withSettings update_setting
    - Failing tests first, written against missing modules, run and recorded red for the expected reason (module missing):
      - New `apps/server/src/settings/settingToolSchema.test.ts`: for each setting name the derived schema has the right type, `minimum`/`maximum`, or `enum`, and the `allowed` descriptor (`number`/`integer` with min and max, `enum` with values, `boolean`) matches the registry. The generated tool description lists the allowed values per name.
      - New `apps/server/src/settings/withSettings.test.ts`, using the real recording bus from `orchestrator/testing`: a valid `update_setting` call emits exactly one `setting_changed` with that name and value and returns `{ ok: true, output: { applied: true, name, value } }`.
      - Unknown name (including "toString" and "__proto__") returns `{ ok: true, output: { applied: false, error } }` where the error names the unknown name; no event.
      - Out-of-range value (speechRate 2, silenceWaitMs 100) returns `applied: false` with an `allowed` descriptor stating min and max and an error mentioning them; no event.
      - Wrong type or enum value (captionSize "huge", highContrast "yes", speechRate "fast", silenceWaitMs 1500.5, NaN, Infinity) returns `applied: false` with an error stating the expected type or listing the allowed enum values; no event.
      - Property test "Feature: settings-agent, Property 8: Update tool emits one event if and only if input is valid", at least 100 runs, over arbitrary names and values. Valid input emits exactly one matching event; otherwise zero events and `applied: false`. Write it first against the missing `withSettings` module, in its own test file.
    - Then create `apps/server/src/settings/settingToolSchema.ts` (reads only from `settingSchemas`) and `apps/server/src/settings/withSettings.ts` following `withContactResolution`, with the unknown-name, bounds (`settingToolSchema` and `validateToolInput`), and type/enum branches, using `isSettingValue` as the final authority. Run green.
    - Files: `apps/server/src/settings/settingToolSchema.ts`, `apps/server/src/settings/settingToolSchema.test.ts`, `apps/server/src/settings/withSettings.ts`, `apps/server/src/settings/withSettings.test.ts`, `apps/server/src/settings/withSettings.property.test.ts`. Split the test files to keep each under 150 lines.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - **Property 8: Update tool emits one event if and only if input is valid**
    - **Validates: Requirements 3.1, 3.3, 3.4, 3.5**
    - _Requirements: 1.4, 3.1, 3.2, 3.3, 3.4, 3.5, 12.6_

  - [x] 3.2 withSettings reset_settings and composition in app.ts
    - Failing tests first, run and recorded red:
      - In `withSettings.test.ts`: calling `reset_settings` with `{}` and with `{ junk: 1 }` each emits exactly one `settings_reset` and returns `{ ok: true }`.
      - Property test "Feature: settings-agent, Property 9: Reset tool ignores input", at least 100 runs over arbitrary objects. Exactly one `settings_reset` is emitted and the result succeeds. Write it first in `apps/server/src/settings/withSettings.reset.property.test.ts`; red is the missing reset behavior.
      - Composition: test the composition at the `createApp` level through the HTTP `/request` route, using the replay/LLM injection already available through `LlmClientOptions`, with a small scripted conversation defined inline in the test (router selects settings, `update_setting`, final text). Read events from `/events` or the hub. This is not redundant with the fixtures group: it proves the wrapper is composed in the real app with a minimal inline script, while the fixtures group proves the shipped Farsi recordings and the no-API-key selection. If `LlmClientOptions` offers no way to inject a scripted client, instead do an orchestrator-level test with the real hub and the same inline script, and leave end-to-end proof to tasks 6.1 and 6.2. Record which path was taken. Red: the stub tool's plain output emits no event.
    - Then add the reset tool to `withSettings.ts` and change `apps/server/src/app.ts` to `withSettings(withContactResolution(createStubTools().tools, fixtureContacts), hub)`. Run green.
    - Files: `apps/server/src/settings/withSettings.ts`, `apps/server/src/settings/withSettings.test.ts`, `apps/server/src/settings/withSettings.reset.property.test.ts`, `apps/server/src/app.ts`, a new or existing app/integration test file.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - **Property 9: Reset tool ignores input**
    - **Validates: Requirements 4.1, 4.4**
    - _Requirements: 3.1, 4.1, 4.4, 12.6, 13.5_

  - [x] 3.3 Router prompt and runSubAgent regression
    - Failing tests first, run and recorded red:
      - The router system prompt built by `routeRequest.ts` mentions settings (speech rate, caption size, contrast, silence wait, restoring normal), names no language (`/farsi/i` does not match), and contains the sentence routing mixed settings plus comms/home/media intents, and unclear settings intents, to the clarifier. Add an orchestrator test where a recorded routing response selecting `settings` reaches the settings agent.
    - Then edit the description and prompt in `apps/server/src/orchestrator/routeRequest.ts`. Run green.
    - Then add the regression test in `apps/server/src/orchestrator/orchestrator.test.ts`, using an inline recorded conversation with the real `withSettings` wrapper and recording bus: `update_setting` with an out-of-range value returns `applied: false`; the run does not fail; the model's final text becomes the reply; no `setting_changed` event is emitted and no success confirmation is produced. This is derived from the wrapper behavior in task 3.1. No new production code is expected, so it is expected to pass on first run; say so in the task notes and treat it as a regression guard. If it fails for any reason, fix `runSubAgent` minimally.
    - Files: `apps/server/src/orchestrator/routeRequest.ts` and its test file, `apps/server/src/orchestrator/orchestrator.test.ts`; `runSubAgent.ts` only if needed.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.6, 5.4_

- [x] 4. Web store
  - [x] 4.1 applyEvent reducer with Properties 3, 4, 5
    - Failing tests first in new `apps/web/src/settings/applyEvent.test.ts`, written against the missing module, run and recorded red:
      - A valid `setting_changed` event returns the new value for that setting and the other three unchanged.
      - `settings_reset` from a non-default state and from the default state yields `defaultSettings` with no error.
      - Unknown name, NaN, Infinity, wrong type, out-of-bounds value, a captionSize outside the sizes, and an unrelated event (for example `speech`) each return the identical state reference.
    - Property tests first in new `apps/web/src/settings/applyEvent.property.test.ts`, at least 100 runs each:
      - "Feature: settings-agent, Property 3: Settings stay within bounds under any event sequence": sequences of 0 to 50 events mixing in-bounds values, out-of-bounds values, and unknown names; every setting satisfies `isSettingValue` after each event.
      - "Feature: settings-agent, Property 4: Invalid events leave state unchanged": over any valid state and any event with an unknown name or invalid value (including NaN, Infinity, wrong types); result deeply equals the prior state.
      - "Feature: settings-agent, Property 5: Reset yields defaults and is idempotent": over any valid state; one reset yields `defaultSettings` and a second yields the same.
    - Then create `apps/web/src/settings/applyEvent.ts` (pure reducer, using `isSettingName` and `isSettingValue`). Run green.
    - Files: `apps/web/src/settings/applyEvent.ts`, `apps/web/src/settings/applyEvent.test.ts`, `apps/web/src/settings/applyEvent.property.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - **Property 3: Settings stay within bounds under any event sequence**
    - **Validates: Requirements 7.2, 7.5, 12.2**
    - **Property 4: Invalid events leave state unchanged**
    - **Validates: Requirements 7.3, 12.4**
    - **Property 5: Reset yields defaults and is idempotent**
    - **Validates: Requirements 4.2, 4.3, 12.3**
    - _Requirements: 4.2, 4.3, 7.2, 7.3, 7.5, 12.2, 12.3, 12.4, 12.6_

  - [x] 4.2 settingsStorage loadSettings and saveSettings with Properties 7 and 6
    - Failing tests first in new `apps/web/src/settings/settingsStorage.test.ts`, written against the missing module, run and recorded red. The throwing storage is an external boundary fake:
      - No saved value gives the defaults; a valid saved state is returned; one invalid field falls back to its default while other valid fields are kept.
      - Unparseable JSON, empty string, and non-object JSON (array, number, string, boolean, null) give the defaults.
      - A storage that throws on read gives the defaults and leaves stored values unmodified.
      - A successful save writes the complete state as JSON under `yazd.settings` and returns true; a storage whose `setItem` throws makes `saveSettings` return false without throwing.
    - Property tests first, at least 100 runs each:
      - "Feature: settings-agent, Property 7: Load falls back per field" in new `apps/web/src/settings/settingsStorage.property.test.ts`: over arbitrary stored strings and partially valid objects; `loadSettings` never throws and each field equals the stored value when `isSettingValue` accepts it, else the default.
      - "Feature: settings-agent, Property 6: Persistence round trip" in `apps/web/src/settings/settingsStorage.dom.test.ts`, using happy-dom `localStorage`: save then load yields a state deeply equal to the original.
    - Then create `apps/web/src/settings/settingsStorage.ts` with key `yazd.settings`, `loadSettings` and `saveSettings`, each inside try/catch. Run green.
    - Files: `apps/web/src/settings/settingsStorage.ts`, `apps/web/src/settings/settingsStorage.test.ts`, `apps/web/src/settings/settingsStorage.property.test.ts`, `apps/web/src/settings/settingsStorage.dom.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - **Property 7: Load falls back per field**
    - **Validates: Requirements 7.1, 7.6, 8.4, 8.5, 8.6**
    - **Property 6: Persistence round trip**
    - **Validates: Requirements 8.8, 12.5**
    - _Requirements: 7.1, 7.6, 7.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 12.5, 12.6_

  - [x] 4.3 createSettingsStore
    - Failing tests first in new `apps/web/src/settings/settingsStore.dom.test.ts`, written against the missing module, using happy-dom `localStorage` and an in-memory event source, run and recorded red:
      - Right after `createSettingsStore` returns, `get()` equals the loaded state (defaults when storage is empty, unavailable, or null).
      - With no surface mounted, a `setting_changed` event pushed on the event source changes `get()`; after `dispose()` further events are ignored.
      - A valid change notifies each subscriber exactly once, synchronously, with the new state; an invalid event, an unrelated event, and an unchanged-by-reset-to-defaults event notify no one; an unsubscribed listener is not called.
      - After a valid change, `localStorage` holds the complete state under `yazd.settings`; a new store created over the same storage starts with that state; after a reset, storage holds the defaults.
      - With a storage fake whose `setItem` throws once (external boundary fake), the in-memory state still updates and subscribers are notified; the next change attempts the write again and succeeds.
    - Then create `apps/web/src/settings/settingsStore.ts` with `get`, `subscribe`, `dispose`, its own event subscription, reference-change notification, a write on every change, and use of the `saveSettings` boolean result so a failed write never blocks state. Run green.
    - Files: `apps/web/src/settings/settingsStore.ts`, `apps/web/src/settings/settingsStore.dom.test.ts`. Split the test file if it nears 150 lines.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.7, 8.1, 8.2, 8.7, 9.7, 9.8_

  - [x] 4.4 strings.settings and describeEvent with Property 10
    - Placed here with the web tasks because `describeEvent` is its first consumer; nothing in contracts or server needs it.
    - Failing tests first, run and recorded red:
      - In the strings package test file: `strings.settings` has display names for all four settings (keyed by `SettingName`), activity templates for changed and reset, and value labels (on/off). Every string key is unique and has exactly one value.
      - In `apps/web/src/activity/describeEvent.test.ts`, using the real strings package: a `setting_changed` event gives one non-empty string containing the setting name and value, using text from `strings.settings`; a `settings_reset` event gives one non-empty string stating that settings were reset, from `strings.settings`.
      - Property test "Feature: settings-agent, Property 10: Activity description names the change", at least 100 runs, over valid `setting_changed` events; the result is non-empty and contains the name and value. Write it first in `apps/web/src/activity/describeEvent.property.test.ts`; red is the missing `strings.settings` group.
    - Then add the group to `packages/strings/src/strings.ts` and replace the hardcoded placeholder text for `setting_changed` and `settings_reset` in `apps/web/src/activity/describeEvent.ts` with text from `strings.settings`. Run green.
    - Files: `packages/strings/src/strings.ts`, the strings test file, `apps/web/src/activity/describeEvent.ts`, `apps/web/src/activity/describeEvent.test.ts`, `apps/web/src/activity/describeEvent.property.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - **Property 10: Activity description names the change**
    - **Validates: Requirements 10.1, 10.2**
    - _Requirements: 10.1, 10.2, 11.1, 11.2, 11.3, 11.4, 12.6_

- [x] 5. Surfaces (Teammate 1 area, minimal wiring)
  - [x] 5.1 SurfaceContext settings store (Teammate 1 area, minimal wiring)
    - Failing test first: a surface mounted with the test context reads `context.settings.get()` equal to `defaultSettings`. Run, record red.
    - Then add `settings: SettingsStore` to `SurfaceContext` in `apps/web/src/surfaces/surface.ts`; make `apps/web/src/testing/testContext.ts` provide a real store over in-memory storage; make `apps/web/src/main.ts` create the store, subscribe it to the live event source, and pass it to the player and the context.
    - Touched files to record: `apps/web/src/surfaces/surface.ts`, `apps/web/src/testing/testContext.ts`, `apps/web/src/main.ts` and the new test file `apps/web/src/settings/settingsContext.dom.test.ts` that holds the red test.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 9.7, 9.8, 16.1, 16.2_

  - [x] 5.2 Speech player: one audio element, preservesPitch and rate per clip (Teammate 1 area, minimal wiring)
    - Failing tests first in `apps/web/src/speech/speechPlayer.test.ts`, with fakes for the audio element factory and `PlaybackContext.createMediaElementSource` (external boundaries), run and recorded red. Update existing fakes accordingly:
      - The player creates one `HTMLAudioElement` and one `MediaElementAudioSourceNode` at construction, connected to the analyser; each clip plays through the same element; `frame()` returns null when idle and a frame while playing; latest-wins ticket logic and stop-previous behavior are preserved; `dispose` releases resources.
      - Before each clip the element has `preservesPitch === true` and `playbackRate === store.get().speechRate`; after a store change to 0.8, the next clip starts at 0.8 while a clip already playing keeps its previous rate.
      - After a rate change to 0.8 and a `settings_reset` event, the next clip uses `defaultSettings.speechRate`, and a clip already playing is not altered. If this passes without new code, say so and keep it as a regression guard.
    - Then replace `decodeAudioData` and `createBufferSource` with the audio element path in `apps/web/src/speech/speechPlayer.ts`, setting `preservesPitch` and `playbackRate` before each play from the store. Run green.
    - Touched files to record: `apps/web/src/speech/speechPlayer.ts`, `apps/web/src/speech/speechPlayer.test.ts`, and any `PlaybackContext` type file.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 9.1, 9.6, 9.9, 16.1, 16.2_

  - [x] 5.3 Captions follow size and contrast live, with CSS (Teammate 1 area, minimal wiring)
    - Failing tests first, run and recorded red:
      - In `apps/web/src/captions/captionsSurface.dom.test.ts` (happy-dom): the host has `data-caption-size` and `data-contrast` matching the store at mount; changing either setting updates the attributes immediately while existing caption blocks are on screen; later captions render under the new attributes; a reset restores defaults.
      - A test reads `apps/web/index.html` and asserts selectors exist for each of the four `data-caption-size` values and both `data-contrast` modes, and that the default selectors match the current look values.
    - Then subscribe to the store in `apps/web/src/captions/captionsSurface.ts` and set the attributes, and add the CSS to `apps/web/index.html`, with defaults matching the existing look. The visual result is verified by eye and noted as such; the test only proves the selectors exist.
    - Touched files to record: `apps/web/src/captions/captionsSurface.ts`, `apps/web/src/captions/captionsSurface.dom.test.ts`, `apps/web/index.html`, and the CSS selector test file.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 9.2, 9.3, 9.6, 9.7, 9.8, 16.1, 16.2_

  - [x] 5.4 Voice surface reads silenceWaitMs at utterance start; remove silenceTimeoutMs (Teammate 1 area, minimal wiring)
    - Failing tests first, run and recorded red:
      - In `apps/web/src/voice/voiceSurface.dom.test.ts`, with the fake clock as an external boundary: an utterance started after the setting is 3000 uses a 3000 ms silence timeout; a change during an utterance leaves that utterance on its previous timeout and applies to the next one; a reset applies the default to the next utterance.
      - Update `apps/web/src/voice/voiceConfig.test.ts` so it no longer expects `silenceTimeoutMs` and asserts the config has no such export, with `noSpeechTimeoutMs` and `silenceThreshold` unchanged. This is a required test change, because the constant is removed by design (Req 9.4); it is not a test weakened to pass. State this in the task notes.
    - Then read `store.get().silenceWaitMs` when an utterance begins in `apps/web/src/voice/voiceSurface.ts` and pass it to `createSilenceDetector`; remove the constant from `apps/web/src/voice/voiceConfig.ts` and fix any remaining reference. Run green.
    - Touched files to record: `apps/web/src/voice/voiceSurface.ts`, `apps/web/src/voice/voiceSurface.dom.test.ts`, `apps/web/src/voice/voiceConfig.ts`, `apps/web/src/voice/voiceConfig.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 1.4, 9.4, 9.5, 9.6, 9.7, 16.1, 16.2_

- [x] 6. Fixtures (required for the demo)
  - [x] 6.1 "speak slower" Farsi fixture, registration, and end to end without an API key
    - Failing tests first, run and recorded red (fixture missing):
      - New `apps/server/src/settings/settingsReplay.test.ts`: replay `speakSlower.json` through the real orchestrator with `createStubTools` wrapped by `withSettings` and the recording bus. Assert routing to `settings`, a `setting_changed` event with `speechRate` below 1.0, and the reply equal to the last text block.
      - New `apps/server/src/settings/settingsApp.test.ts` (or the integration test file if short enough): `createApp({})` with no `OPENROUTER_API_KEY` receives the Farsi "speak slower" transcript at `/request`, and `/events` yields a `setting_changed` event with `speechRate` below 1.0.
    - Then create `apps/server/src/orchestrator/fixtures/speakSlower.json`: transcript is the Persian phrase for "speak slower" in Farsi script; recorded responses are router to `settings`, `update_setting` with `speechRate` 0.8, and a one-sentence Farsi confirmation. Register the fixture in `apps/server/src/llm/replayConversations.ts`. Run green.
    - Files: `apps/server/src/orchestrator/fixtures/speakSlower.json`, `apps/server/src/llm/replayConversations.ts`, `apps/server/src/settings/settingsReplay.test.ts`, `apps/server/src/settings/settingsApp.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 15.1, 15.3, 15.5, 15.6_

  - [x] 6.2 "go back to normal" Farsi fixture, registration, and end to end without an API key
    - Failing tests first, run and recorded red (fixture missing):
      - In `settingsReplay.test.ts` (split if near 150 lines): replay `resetSettings.json` the same way and assert routing to `settings`, a `settings_reset` event, and the reply equal to the last text block.
      - In the same e2e test file as 6.1: the Farsi "go back to normal" transcript posted to `/request` on `createApp({})` yields a `settings_reset` event on `/events`.
    - Then create `apps/server/src/orchestrator/fixtures/resetSettings.json`: transcript is the Persian phrase for "go back to normal" in Farsi script; router to `settings`, `reset_settings`, and a one-sentence Farsi confirmation. Register it in `replayConversations.ts`. Run green.
    - Files: `apps/server/src/orchestrator/fixtures/resetSettings.json`, `apps/server/src/llm/replayConversations.ts`, `apps/server/src/settings/settingsReplay.test.ts`, `apps/server/src/settings/settingsApp.test.ts`.
    - Done: `npm test`, `npm run lint`, `npm run typecheck` pass.
    - _Requirements: 15.2, 15.4, 15.5, 15.6_

- [x] 7. Final verification
  - [x] 7.1 Full checks, audits, and final summary
    - Run `npm test`, `npm run lint`, and `npm run typecheck`; all must pass.
    - Search the diff for added code comments in changed files (for example `git diff -U0 | grep -E '^\+\s*(//|/\*|\*)'` and a check of untracked files). Fix any hit and re-run all checks.
    - Confirm every changed or new file is under 150 lines.
    - Confirm `git status` shows `KIRO_LOG.md` and `.env.example` were not touched by this work.
    - Deliver the final summary to the user:
      - List every touched file in the apps/web voice, captions, and speech areas (Teammate 1 area), as recorded in tasks 5.1 to 5.4 (Req 16.3).
      - List every file touched outside the planned set in the design's file table.
      - State the known limitation: the server keeps no settings state, so relative requests are resolved to absolute values (Req 14).
      - Remind the user that nothing was committed.
    - Files: none expected unless the audit finds a violation.
    - Done: all three commands pass, the audit is clean, and the summary is delivered.
    - _Requirements: 13.1, 13.3, 13.5, 13.6, 14.1, 14.4, 16.3_

## Notes

- The only allowed typecheck-red window is between task 1.1 and task 1.2.
- Task 2 was a hard stop and is done; the user said to continue.
- Each property test is tagged with its property number and requirement clauses.
- Property tests are written first against a missing function or module; that failing run is the red run. Production code is never mutated to show red.
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
    { "id": 11, "tasks": ["4.1"] },
    { "id": 12, "tasks": ["4.2"] },
    { "id": 13, "tasks": ["4.3"] },
    { "id": 14, "tasks": ["4.4"] },
    { "id": 15, "tasks": ["5.1"] },
    { "id": 16, "tasks": ["5.2"] },
    { "id": 17, "tasks": ["5.3"] },
    { "id": 18, "tasks": ["5.4"] },
    { "id": 19, "tasks": ["6.1"] },
    { "id": 20, "tasks": ["6.2"] },
    { "id": 21, "tasks": ["7.1"] }
  ]
}
```
