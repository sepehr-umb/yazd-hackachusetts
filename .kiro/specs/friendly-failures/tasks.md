# Implementation Plan

Scope: only `packages/contacts`, `packages/strings` and `apps/server`. Do not touch `apps/web` or `packages/contracts` (the `AssistantEvent` contract and `RequestResult` stay as they are). No code comments. Every file stays under 150 lines. No new dependency: `fast-check` is already a root devDependency. Mock only the `LlmClient` boundary (hand-written fakes and `createReplayLlmClient`) and the TTS fetch boundary. Never call a paid API. Do not read or edit `.env`.

Wording review: the Farsi, Arabic and Italian apology strings in `packages/strings` are written by the model and have not been checked by a native speaker. The user must review the wording of every non-English apology before it ships. Task 3.2 and the checkpoint repeat this.

Test edits rule: some existing tests assert behavior that this bugfix intentionally changes. Where a task edits one, it says so, and the change summary must state that the test was corrected because the behavior intentionally changed, not bent to make it pass. The affected tests are: the `withContactResolution` tests expecting `ok: false` (task 3.3 and 3.4), the `resolveContact` failure arm tests (task 3.3), the ambiguous-contact test in `integration.test.ts` and the `callAhmadi.json` fixture (task 3.12), the `spokenText` failed-branch rows (task 3.9), the `speaker` tests that pass a `RequestResult` (task 3.9), and any server or integration test asserting the old `describeFailure` caption or speech text (tasks 3.10 and 3.11).

- [x] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - Friendly Failures and Contact Misses as Data
  - **CRITICAL**: These tests MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: These tests encode the expected behavior and will validate the fix when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Use `fast-check` for the alias and `closest` length rules; use concrete cases for the contact miss, ambiguity, prompt rule and failed-request caption
  - Bug condition from design: `isBugCondition(input)` is true when a contact tool has no unique match and returns `ok: false`, or a failed request is spoken or captioned as `describeFailure` output, or "mamma" / "papà" fails to match
  - Add only tests that target existing modules so they compile on unfixed code:
    - `packages/contacts` (new `fixtures/aliases.test.ts` or beside the fixtures): `matchContact("mamma", fixtureContacts)` top candidate is `فاطمه` and not ambiguous; `"mom"` also gives `فاطمه`; `"papà"`, `"papa"` and `"dad"` give `حسین احمدی` and not ambiguous
    - `apps/server/src/contacts/withContactResolution.test.ts`: new cases only. `send_message` with `mio cugino` returns `ok: true`, `output.applied` false, non-empty `reason`, `closest.length <= 3`, and the underlying tool is not called. `call_contact` with `احمدی` returns `applied: false` naming the two Ahmadi contacts (at most 3) and does not call the underlying tool
    - `apps/server/src/orchestrator/agents.test.ts`: new case. Every `agentDefinitions[*].system` (comms, home, media, settings, clock, clarifier) contains the shared `applied false` rule text, contains "the user's language", names no language and names no tool
    - `apps/server/src/failure/friendlyFailure.test.ts` (new file, uses `createServer` with a fake `LlmClient` that always throws, same harness style as `integration.test.ts`): a failed request for the Italian text "chiama mamma" produces a caption and a synthesized speech text that contain no tool name, do not contain `describeFailure(failure)`, are non-empty, and are the same string
  - Run `npm test` on UNFIXED code and show the red output
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bug exists)
  - Document counterexamples (for example: `withContactResolution` returns `{ ok: false, error: 'No contact matches "mio cugino"' }`, `matchContact("mamma")` has no candidates, the agent prompts lack the `applied false` rule, the caption is `The language model failed: ...`)
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Everything Outside the Bug Condition
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on UNFIXED code, for inputs where `isBugCondition` is false:
    - Every fixture contact name and every existing alias (`مامان`, `بابا`, `Mom`, `Dad`, `آقا جون`, full names in Persian, Arabic and Latin script) resolves to the same top contact, with no new ambiguity between existing contacts
    - A unique match calls the underlying tool once with the stored contact name and returns `ok: true` with `contact` set to the stored name
    - An underlying tool returning `ok: false` or throwing passes through `withContactResolution` unchanged
    - `spokenText` on `succeeded` and `clarification` results returns the agent reply and the question exactly as before
    - Settings and clock `applied: false` output keeps its shape; the settings and clock prompts keep their existing instructions
    - `describeFailure` output for every `RequestFailure` reason is unchanged
    - Event types and order for succeeded, clarification and failed requests stay the same (`state`, `agent`, `tool_call`, `transcript`, `speech`, `caption`), and the `/request` response is the original `RequestResult`
    - Routing, `MAX_TOOL_TURNS`, and tool validation behave as before
  - Write property-based tests capturing these patterns, using `fast-check` over contact names and aliases, generated `succeeded` and `clarification` results, and every `RequestFailure` reason. Write them against current APIs only. Do not reference the new signatures, so they compile and pass now and still compile after the fix
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 3. Fix for raw English failures, contact misses ending the run, missing prompt rule and missing Italian aliases

  Order is bottom-up. Each sub-task is its own red/green cycle: write the failing test for that behavior, run it, show the red output, write the minimum code, run the full suite, show green, then refactor with the suite green.

  Expected transient typecheck failures (tests and lint should stay green; only `npm run typecheck` may fail between these points):
  - After 3.3 until 3.4 is done: `withContactResolution.ts` reads `resolution.error`, which no longer exists on the failure arm. Restored in 3.4.
  - After 3.9 until 3.10 is done: `server.ts` still calls `speaker.speak(result)` and `spokenText(result)` with a full `RequestResult`. Restored in 3.10.
  - No other transient failure is expected. 3.1, 3.2, 3.5, 3.6, 3.7 and 3.8 only add exports or new modules, and 3.11 and 3.12 only wire what already type-checks.
  - If typecheck fails anywhere else, stop and diagnose before continuing.

  - [x] 3.1 Add Italian aliases and `closestContacts` in `packages/contacts`
    - Red first: add a test for `closestContacts` in `packages/contacts/src/closestContacts.test.ts`: ordering best first, limit default 3, explicit limit respected, zero scores dropped, empty query and empty list give `[]`. Add a `fast-check` property: for any query and any contact list, the length is at most 3. Add the alias cases from task 1 if not already there. Run and show red
    - Create `packages/contacts/src/closestContacts.ts` exporting `closestContacts(query, contacts, limit = 3): Contact[]` built on `matchContact(query, contacts, { threshold: 0 })`
    - Export it from `packages/contacts/src/index.ts`
    - In `packages/contacts/src/fixtures/contacts.ts` set `حسین احمدی` aliases to `["بابا", "Dad", "papà", "papa"]` and `فاطمه` aliases to `["مامان", "Mom", "mamma"]`
    - Keep the existing preservation test from task 2 green
    - _Bug_Condition: isBugCondition(input) where input.contactQuery IN {"mamma", "papà"} and no match_
    - _Expected_Behavior: alias top candidate is the expected contact and not ambiguous; closest has at most 3 entries_
    - _Preservation: existing names and aliases keep matching the same contacts with no new ambiguity_
    - _Requirements: 2.1, 2.2, 2.5, 3.6_

  - [x] 3.2 Add `detectLanguage` and the `friendlyApology` table in `packages/strings`
    - Red first: create `packages/strings/src/detectLanguage.test.ts`. Cases: Farsi text gives `fa`; Arabic-only letters (`ي ك ة ى`) give `ar`; Arabic script with neither set gives `fa`; Italian accents or cue words give `it`; plain English gives `en`; empty, digits, `????`, mixed and other scripts give `en`. Add a `fast-check` property: for any string the result is one of `fa`, `ar`, `it`, `en` and never throws. Run and show red
    - Create `packages/strings/src/detectLanguage.ts` exporting `detectLanguage(text)` and the `Language` type
    - Red first: create `packages/strings/src/friendlyApology.test.ts`. One example per language for `llm_error`; a table completeness test derived from the `RequestFailure["reason"]` union and every language, so a new reason fails the test; a `fast-check` property over every `ToolName`, every reason and any request text: the result is non-empty, contains no tool name and does not contain `describeFailure` text. Run and show red
    - Create `packages/strings/src/friendlyApology.ts` exporting the `apologies` table and `friendlyApology(failure, requestText)`. Each entry is one short sentence: apologize, say it did not work or was not understood, ask the user to try again or say it another way. No tool names and no technical words. Use `Mi dispiace, non ci sono riuscito. Riprova tra poco.` for the Italian `llm_error` entry
    - Export both from `packages/strings/src/index.ts`. `describeFailure` and `strings.failure` stay unchanged
    - If the table pushes the file near 150 lines, split it into one file per language that the table file composes
    - **Native-speaker review needed**: the Farsi, Arabic and Italian apology strings are model-written. The user must review the wording before it ships. Say so in the change summary
    - _Bug_Condition: failed request spoken as describeFailure output in English with tool names_
    - _Expected_Behavior: apology in the request language with no tool name and no describeFailure text_
    - _Preservation: describeFailure and strings.failure unchanged_
    - _Requirements: 2.3, 3.5_

  - [x] 3.3 Return a structured miss from `resolveContact` and correct its tests
    - Red first: in the `resolveContact` tests (the existing file, or `apps/server/src/contacts/resolveContact.test.ts` if none exists), assert the failure arm is `{ ok: false, reason: "no_match" | "ambiguous", closest: string[] }`. `no_match` uses `closestContacts`; `ambiguous` uses the first 3 candidates from `matchContact`. Add a `fast-check` property: `closest.length <= 3` for any query. Run and show red
    - Change `apps/server/src/contacts/resolveContact.ts` so the failure arm is `{ ok: false; reason: "no_match" | "ambiguous"; closest: string[] }`. The success arm is unchanged
    - **Existing test edit**: any existing `resolveContact` assertion on the old `error` string is corrected here because the failure arm intentionally changed from an error string to `reason` and `closest`. State this in the change summary. The test was corrected because behavior intentionally changed, not bent to pass
    - **Expected transient failure**: `npm run typecheck` fails in `withContactResolution.ts` (it still reads `error`). Tests that exercise `withContactResolution` may also fail until 3.4. Restored in 3.4
    - _Bug_Condition: resolveContact returns an error string for a miss or ambiguity_
    - _Expected_Behavior: structured reason and at most 3 closest names_
    - _Preservation: unique match arm unchanged_
    - _Requirements: 2.1, 2.2, 3.1_

  - [x] 3.4 Return `applied: false` from `withContactResolution` and correct its tests
    - Red first: the contact miss and ambiguity cases from task 1 are the red tests. Add a `fast-check` property: for any query string, `withContactResolution` either calls the underlying tool exactly once with a stored contact name, or returns `ok: true` with `applied: false` and does not call it. Run and show red
    - In `apps/server/src/contacts/withContactResolution.ts`, on a failed resolution return `{ ok: true, output: { applied: false, reason, closest } }` without calling `tool.execute`. `reason` is a short English sentence for the model such as `No contact matched` or `Several contacts matched`; it never reaches the user directly
    - A unique match and the pass-through of an underlying `ok: false` or throw stay as they are
    - **Existing test edit**: existing `withContactResolution` tests that expect `ok: false` for a miss or ambiguity are corrected here because the behavior intentionally changed (a miss is now `ok: true` with `applied: false`). State this in the change summary. The tests were corrected because behavior intentionally changed, not bent to pass. Tests for unique match and pass-through are not edited
    - Update any other server test that expected the old `tool_failed` outcome for a contact miss, including `withContactResolution.test.ts` (the ambiguous case at line 42 expects `ok: false` with an English error) and orchestrator or fixture tests, and the `callAhmadi.json` fixture (see 3.12), and say so for each in the change summary
    - **Transient failure restored**: `npm run typecheck` passes again after this sub-task
    - _Bug_Condition: isBugCondition(input) where input.tool IN {call_contact, send_message} AND no unique match AND toolResult.ok = false_
    - _Expected_Behavior: ok true, applied false, non-empty reason, closest at most 3, underlying tool not called_
    - _Preservation: unique match and underlying ok false or throw pass-through_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.7_

  - [x] 3.5 Add `appliedFalseRule` to every agent prompt in `agents.ts`
    - Red first: the prompt test from task 1 is the red test. Extend it to check the rule is appended to the `clarifier` prompt too, that each prompt still contains "the user's language", and that the clarifier keeps its single-question instruction. Run and show red
    - In `apps/server/src/orchestrator/agents.ts` add `const appliedFalseRule`: if a tool result has applied false, explain briefly in the user's language, ask one short question if it helps, and never mention tool names. Append it to every prompt, including `clarifier`
    - Settings and clock prompts keep their existing instructions (relative setting changes, `get_time` first, no time or day when unavailable)
    - If `agents.ts` would exceed 150 lines, move the shared rule to its own small module that `agents.ts` imports
    - _Bug_Condition: sub-agent prompts say nothing about applied false_
    - _Expected_Behavior: every prompt carries the shared rule, names no language and no tool_
    - _Preservation: settings and clock instructions and routing unchanged_
    - _Requirements: 2.4, 3.4, 3.8_

  - [x] 3.6 Add `failure/askModelForApology.ts`
    - Red first: create `apps/server/src/failure/askModelForApology.test.ts` with a hand-written fake `LlmClient`. Cases: returns the trimmed first text block; returns `undefined` for a throw, a rejection, empty text, whitespace text and tool-use-only output; returns `undefined` for a hung client using fake timers after `APOLOGY_TIMEOUT_MS`; the client is called exactly once with `tools: []`, a system prompt that names no language, and the raw request text as the only user message; the timer is cleared on success. Run and show red
    - Create `apps/server/src/failure/askModelForApology.ts` as designed: one `llm.complete` call, race against a 3000 ms timer, no retry, no loop, no `runSubAgent`, no `withLlmCallErrors`, no failure details in the prompt
    - _Bug_Condition: failed request has no language-aware reply_
    - _Expected_Behavior: model apology in the request language or undefined_
    - _Preservation: orchestrator LLM call count and MAX_TOOL_TURNS unchanged_
    - _Requirements: 2.3, 3.8_

  - [x] 3.7 Add `failure/replier.ts`
    - Red first: create `apps/server/src/failure/replier.test.ts`. Cases: `succeeded` and `clarification` return the same string as `spokenText` and make no LLM call; a clean model text is used for `failed`; the table text is used when the model throws, times out, returns empty text, leaks a `toolNames` entry (case-insensitive) or contains `describeFailure(result.failure)`; the table text is used when no `llm` is given; the table text is in the language of the request. Add a `fast-check` property: for any fake model output, including strings containing tool names, the reply is non-empty and contains no tool name. Run and show red
    - Create `apps/server/src/failure/replier.ts` exporting `createReplier({ llm?, timeoutMs? })` returning `{ reply(result, requestText): Promise<string> }`, built on `askModelForApology`, `friendlyApology` and `spokenText`. Call `spokenText` only for `succeeded` and `clarification` results after narrowing on `status`, so the later signature change in 3.9 needs no edit here
    - _Bug_Condition: failed result spoken and captioned as describeFailure output_
    - _Expected_Behavior: one reply string with no tool name, no describeFailure text, never empty_
    - _Preservation: succeeded and clarification replies exactly as before_
    - _Requirements: 2.3, 3.3, 3.5_

  - [x] 3.8 Cover the replier with a replay-model fallback check
    - Red first: add a test to `apps/server/src/failure/replier.test.ts` using `createReplayLlmClient` for a request it does not know: the replier falls back to the table and the default suite makes no paid call. Run and show red if the behavior is missing, or green immediately and say so; do not weaken the assertion
    - No production change is expected here. Only add code if the test reveals a gap in `replier.ts`
    - _Requirements: 2.3_

  - [x] 3.9 Make `spokenText` and `speaker` operate on strings and correct their tests
    - Red first: update `apps/server/src/speech/spokenText.test.ts` so it covers only `succeeded` and `clarification`, and update the speaker test so `speak(text)` synthesizes exactly the given string, stores it and emits `speech`. Run and show red
    - In `apps/server/src/speech/spokenText.ts` drop the failed branch; the function takes only `succeeded` and `clarification` results. In `apps/server/src/speech/speaker.ts` change `speak(result)` to `speak(text)`
    - **Existing test edit**: the `spokenText` failed-branch rows are removed from `spokenText.test.ts` and their coverage moves to the replier tests from 3.7. The speaker tests that passed a `RequestResult` now pass a string. Both were corrected because behavior intentionally changed (failed text is produced only by the replier and the speaker no longer formats results), not bent to pass. State this in the change summary
    - **Expected transient failure**: `npm run typecheck` fails in `server.ts` (still calls `speaker.speak(result)` and `spokenText(result)` with a full `RequestResult`). Restored in 3.10
    - _Bug_Condition: spokenText runs describeFailure for failed results and is called twice per request_
    - _Expected_Behavior: raw failure text cannot reach speech by another route_
    - _Preservation: succeeded and clarification text unchanged_
    - _Requirements: 2.3, 3.3_

  - [x] 3.10 Wire the replier into `server.ts`
    - Red first: the `friendlyFailure.test.ts` case from task 1 is the red test. Add a case where the fake model hangs: the request still completes after the timeout with the table text. Add a case where `/request` still returns the original `RequestResult` and the activity data still carries the original failure. Run and show red
    - In `apps/server/src/server.ts` add optional `apologyLlm?: LlmClient` to `ServerDeps`, build one replier in `createServer`, and in `runPipeline` compute `const replyText = await replier.reply(result, text)` once, then call `captioner.announce("assistant", replyText)` and `speaker.speak(replyText)`
    - **Existing test edit**: any server test asserting the old `describeFailure` caption or speech text for a failed request is corrected because the behavior intentionally changed, not bent to pass. List each in the change summary
    - If `server.ts` would exceed 150 lines, extract the reply step into a small module under `apps/server/src/failure/`
    - **Transient failure restored**: `npm run typecheck` passes again after this sub-task
    - _Bug_Condition: caption and speech both built from describeFailure output_
    - _Expected_Behavior: caption.text = speech input = reply, no tool name, no describeFailure text_
    - _Preservation: event types and order, RequestResult shape, describeFailure for the activity panel_
    - _Requirements: 2.3, 3.3, 3.5, 3.7_

  - [x] 3.11 Wire the LLM client into `app.ts`
    - Red first: add a test in the existing app wiring tests (for example `clockWiring.test.ts` style) that with no `OPENROUTER_API_KEY` a failing request still produces the table apology and makes no network call. Run and show red
    - In `apps/server/src/app.ts` create the LLM client once and pass it to both `createOrchestrator` and `createServer({ apologyLlm })`. With no key this is the replay client, and an unknown request falls back to the table
    - Any app test that sets `OPENROUTER_API_KEY` must keep a non-blank `TTS_MODEL` and `TTS_VOICE`
    - _Bug_Condition: app has no path to a language-aware reply_
    - _Expected_Behavior: one shared LLM client, offline fallback to the table_
    - _Preservation: default test suite makes no paid call_
    - _Requirements: 2.3, 3.8_

  - [x] 3.12 Add integration tests
    - In `apps/server/src/failure/friendlyFailure.test.ts` and `apps/server/src/integration.test.ts` cover: a model that fails every call gives one caption and one speech with the same string, in the language of the request, with no tool name; the comms agent with a replayed fixture for "manda un messaggio al mio cugino" gets `applied: false` from the tool, the run ends `succeeded` with the agent's Italian reply, and the events show `started` then `succeeded`; the "call Ahmadi" demo keeps working (user requirement): extend the existing `apps/server/src/orchestrator/fixtures/callAhmadi.json` (transcript `به احمدی زنگ بزن`) with a third recorded response, an `end_turn` text in Farsi that asks one short question naming the two options (`حسین احمدی` and `حسن احمدی`). The fixture previously ended after the `call_contact` tool use because the run failed; now `call_contact` returns `applied: false` data, so the agent needs a final reply, and without the third response the replay would run out of recorded responses. State in the change summary that this fixture was extended because behavior intentionally changed. Add a test (`apps/server/src/contacts/callAhmadiReplay.test.ts`, replaying `callAhmadi.json` through the real orchestrator with `withContactResolution(createStubTools().tools, fixtureContacts)`) that asserts: the run ends `succeeded` with the question text as the reply, the question names both options, the stub `calls` list is empty (no `call_contact` reached the underlying tool, so no guessed contact), and the events show `tool_call` `call_contact` `started` then `succeeded` with no `failed`. Also assert the same through `createApp({})` with no API key, reading `/events` for a caption and a speech event whose text is that question; the replier does not change the number of orchestrator LLM calls and `too_many_steps` still yields the apology; `tool_failed` from a throwing tool yields the apology
    - Add the replay fixtures under `apps/server/src/orchestrator/fixtures/` (for example `sendMessageUnknownContact.json`, `callAhmadiAmbiguous.json`) and register them in `replayConversations.ts` only if needed
    - Update the existing ambiguous-contact test in `apps/server/src/integration.test.ts` (around line 105, "broadcasts a failed tool call and the error state when the contact is ambiguous"): it currently expects a `tool_failed` result and an error state, which is the old behavior. Correct it to the new behavior (a succeeded result with the question, `started` then `succeeded`), and state that it was corrected because behavior intentionally changed, not bent to pass
    - Confirm `git status` shows no change under `apps/web` or `packages/contracts`
    - _Requirements: 2.1, 2.2, 2.3, 3.5, 3.7, 3.8_

  - [x] 3.13 Verify bug condition exploration tests now pass
    - **Property 1: Expected Behavior** - Friendly Failures and Contact Misses as Data
    - **IMPORTANT**: Re-run the SAME tests from task 1 - do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - **EXPECTED OUTCOME**: Tests PASS (confirms bug is fixed)
    - Show the green output after the red output from task 1
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.14 Verify preservation tests still pass
    - **Property 2: Preservation** - Everything Outside the Bug Condition
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after the fix
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run `npm test`, `npm run lint` and `npm run typecheck`; all three must pass with no transient failure left
  - Confirm every changed file is under 150 lines, has no comments, and that no dependency was added
  - Confirm nothing changed under `apps/web` or `packages/contracts`
  - List every existing test that was edited and why, each marked as corrected because behavior intentionally changed
  - Remind the user that the Farsi, Arabic and Italian apology strings need native-speaker review before shipping, and that live-model wording of the apology is checked only in `npm run eval`
  - Ask the user if questions arise
