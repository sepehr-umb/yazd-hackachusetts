# Friendly Failures Bugfix Design

## Overview

When a request fails, yazd speaks and captions raw English such as `send_message failed: No contact matches "mio cugino"`, even for an Italian speaker. Three code paths cause it:

- `withContactResolution` returns `ok: false` for a contact miss or ambiguity. `runSubAgent` turns every `ok: false` into `tool_failed` and ends the run, so the comms agent never answers.
- `spokenText` sends every failed result through `describeFailure`, which is English and contains tool names. `server.ts` uses that one string for the assistant caption, and `createSpeaker` calls `spokenText` again for audio.
- The demo contacts have no Italian aliases, and the sub-agent prompts say nothing about `applied: false`.

The fix has four parts:

1. `withContactResolution` returns a miss or ambiguity as `ok: true` with `applied: false`, a reason, and up to 3 closest names. The underlying tool is not called.
2. Every sub-agent prompt in `agents.ts` shares one `applied: false` instruction.
3. A failed request gets a friendly apology in the request's language. It is computed once per request, then reused for the caption and the speech so both are identical.
4. The fixture contacts gain `mamma` and `papà` aliases.

`describeFailure`, `RequestResult`, `RequestFailure`, `AssistantEvent` and `apps/web` do not change.

### Decisions on the open questions

**How the apology is produced.** One direct LLM call with a language-agnostic prompt. If it fails, times out, returns empty text, returns text that leaks internal wording, or is unusable for any reason, a static multilingual table in `packages/strings` supplies the reply. The table covers Farsi, Italian, English and Arabic. The language is chosen from the request text by script and a few Italian cues, with English as the last resort.

Tradeoff recorded: the LLM call covers any language but is likely to fail exactly when the failure is `llm_error`. The static table works offline but covers four languages. Together, an unlisted language gets a good answer when the model is up and an English answer when it is not. The fallback is never silent text with tool names.

**Where the fallback sits.** In a new `replier` in `apps/server/src/failure/`. `runPipeline` in `server.ts` calls it once after `orchestrator.handle`, and passes the same string to `captioner.announce` and to the speaker. `spokenText` is no longer called twice for failed results. `describeFailure` is untouched and the activity panel keeps showing it from the returned `RequestResult`.

**`tool_failed`.** Covered. A tool that throws or returns `ok: false` gets the same apology.

**Unknown language.** `detectLanguage` never returns "unknown". It returns `fa`, `ar`, `it` or `en`. Arabic-script text with no Arabic-only letters is treated as Farsi, because Farsi is the reference user. Latin text with no Italian cues, empty text, digits and other scripts get English.

## Glossary

- **Bug_Condition (C)**: A contact tool with no unique match returns `ok: false`, or a failed request is spoken or captioned as `describeFailure` output, or an Italian relationship word fails to match.
- **Property (P)**: The user hears and reads a short apology or question in their language with no tool names or error text, and the contact words match.
- **Preservation**: Unique matches, tool pass-through errors, succeeded and clarification replies, other tools' `applied: false` shape, `describeFailure`, event types and order, and existing aliases stay the same.
- **withContactResolution**: In `apps/server/src/contacts/withContactResolution.ts`. Wraps `call_contact` and `send_message` and resolves the spoken name.
- **resolveContact**: In `apps/server/src/contacts/resolveContact.ts`. Returns `{ ok: true, name }` or an error string today.
- **spokenText**: In `apps/server/src/speech/spokenText.ts`. Maps a `RequestResult` to the speech and caption string.
- **Replier**: New server module that returns the single reply string for a `RequestResult` and the request text.
- **Apology table**: New static table in `packages/strings`, keyed by failure reason and language.
- **applied: false**: The convention used by `withSettings` and `withClock` to report a soft miss as `ok: true` data so the agent can answer.

## Bug Details

### Bug Condition

The bug shows when a contact tool cannot pick one contact, when a request ends as `failed`, or when the user says "mamma" or "papà". `resolveContact` returns an error string, `runSubAgent` ends the run on `ok: false`, `spokenText` returns `describeFailure` text, and the fixture contacts have no Italian aliases.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type SpokenOutcome
  OUTPUT: boolean

  RETURN (input.tool IN {call_contact, send_message}
            AND NOT hasUniqueMatch(input.contactQuery, contacts)
            AND input.toolResult.ok = false)
      OR (input.result.status = "failed"
            AND (spokenText(input.result) = describeFailure(input.result.failure)
                 OR caption(input.result) = describeFailure(input.result.failure)))
      OR (input.contactQuery IN {"mamma", "papà"}
            AND NOT matches(input.contactQuery, expectedContact))
END FUNCTION
```

### Examples

- "manda un messaggio al mio cugino": `send_message` gets `mio cugino`, nothing matches, yazd says `send_message failed: No contact matches "mio cugino"`. Expected: the comms agent replies in Italian that it found no such contact and offers up to 3 close names.
- "زنگ بزن به احمدی": two contacts match. Today the run ends with `call_contact failed: Several contacts match ...`. Expected: the comms agent asks in Farsi which one, naming at most 3.
- "chiama mamma": no match today. Expected: matches `فاطمه`, not ambiguous.
- The LLM is down for "chiama mamma". Today the user hears `The language model failed: <message>`. Expected: `Mi dispiace, non ci sono riuscito. Riprova tra poco.` from the static table, in the caption and the speech.
- Edge: request text is `????`. Expected: the English apology, never an empty string.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- A unique contact match calls the underlying tool with the stored name and returns `ok: true` with `contact` set to the stored name.
- An underlying tool `ok: false` or throw passes through `withContactResolution` unchanged.
- `succeeded` and `clarification` results are spoken and captioned exactly as before.
- Settings and clock `applied: false` output keeps its shape. Their prompt rules stay.
- `describeFailure`, `RequestResult`, `RequestFailure` and `AssistantEvent` keep their shapes. `apps/web` is untouched.
- Existing aliases and names keep matching the same contacts with no new ambiguity.
- Routing, `MAX_TOOL_TURNS`, tool validation and event order stay. A contact miss now emits `started` then `succeeded`.

**Scope:**
Inputs that are not a contact miss, not a failed result, and not "mamma" or "papà" are unaffected. This includes:
- Light, media, settings and clock requests that succeed
- Clarification questions
- Existing Farsi, Arabic and Latin contact names

## Hypothesized Root Cause

1. **Contact miss modelled as failure**: `resolveContact` returns `{ ok: false, error }` and `resolving` returns it directly. `runSubAgent` ends on any `ok: false`. `withSettings` and `withClock` already use `applied: false` to avoid this.
2. **One English string for two sinks**: `spokenText` is the only formatter for speech and caption. Its failed branch returns `failure.message` for `llm_error` or `describeFailure` otherwise. Both are English or raw.
3. **Missing prompt rule**: The agent prompts mention `applied: false` only in clock. The model may echo `reason` or a tool name.
4. **Missing aliases**: `fixtureContacts` has `بابا`, `Dad`, `مامان`, `Mom` and nothing Italian. `normalizeText` lowercases but does not strip Latin accents, so `papà` needs its own alias. `mom` and `dad` already match through lowercase and need tests only.

## Correctness Properties

Property 1: Bug Condition - Failures are friendly and contact misses are data

_For any_ input where the bug condition holds (isBugCondition returns true), the fixed code SHALL return `ok: true` with `applied: false`, a non-empty reason and at most 3 closest names without calling the underlying tool for a contact miss or ambiguity, SHALL speak and caption one identical apology that contains no tool name and no `describeFailure` text for a failed request, and SHALL match "mamma" and "mom" to `فاطمه` and "papà" and "dad" to `حسین احمدی` without ambiguity.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation - Everything outside the bug condition

_For any_ input where the bug condition does NOT hold, the fixed code SHALL produce the same result as the original code, preserving unique contact matches, tool error pass-through, succeeded and clarification replies, settings and clock output, `describeFailure`, the event contract, and existing contact matching.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

## Fix Implementation

### Changes Required

Assuming the root cause analysis is correct. Every file stays under 150 lines, and nothing gets comments.

**File**: `packages/contacts/src/closestContacts.ts` (new)

- `closestContacts(query, contacts, limit = 3): Contact[]` calls `matchContact(query, contacts, { threshold: 0 })`, drops zero scores and returns at most `limit` contacts, best first.
- Exported from `packages/contacts/src/index.ts`.

**File**: `packages/contacts/src/fixtures/contacts.ts`

- `حسین احمدی` aliases become `["بابا", "Dad", "papà", "papa"]`.
- `فاطمه` aliases become `["مامان", "Mom", "mamma"]`.

**File**: `apps/server/src/contacts/resolveContact.ts`

- The failure arm becomes `{ ok: false; reason: "no_match" | "ambiguous"; closest: string[] }`.
- `no_match` uses `closestContacts`. `ambiguous` uses the first 3 candidates from `matchContact`.

**File**: `apps/server/src/contacts/withContactResolution.ts`

- On a failed resolution, return `{ ok: true, output: { applied: false, reason, closest } }` and do not call `tool.execute`. `reason` is a short English sentence for the model, for example `No contact matched` or `Several contacts matched`. It never reaches the user directly.
- A unique match and the pass-through of an underlying `ok: false` stay as they are.

**File**: `apps/server/src/orchestrator/agents.ts`

- Add `const appliedFalseRule` with the instruction: if a tool result has applied false, explain briefly in the user's language, ask one short question if it helps, and never mention tool names. Append it to every prompt, including `clarifier`.
- Every prompt keeps the phrase "the user's language" and names no language.

**File**: `packages/strings/src/detectLanguage.ts` (new)

- `detectLanguage(text): "fa" | "ar" | "it" | "en"`. Pure function.
- Arabic script: Farsi-only letters (`پ چ ژ گ ک ی`) give `fa`. Arabic-only letters (`ي ك ة ى`) give `ar`. Neither gives `fa`.
- Latin script: Italian cues (`à è é ì ò ù`, or whole words such as `il la mio mia di che per un una al mamma papà chiama manda`) give `it`. Otherwise `en`.
- Mixed or no letters give `en`.

**File**: `packages/strings/src/friendlyApology.ts` (new)

- `apologies: Record<RequestFailure["reason"], Record<Language, string>>` holds one short sentence per reason and language. Apologize, say it did not work or was not understood, ask the user to try again or say it another way. No tool names, no technical words.
- `friendlyApology(failure, requestText): string` returns `apologies[failure.reason][detectLanguage(requestText)]`.
- Exported from `packages/strings/src/index.ts`. `describeFailure` and `strings.failure` stay.

**File**: `apps/server/src/failure/askModelForApology.ts` (new)

- Calls `llm.complete` once with `tools: []`, a system prompt that names no language, and the raw request text as the only user message. The prompt asks for one short apology in the language of the user's message, saying it could not do that and to try again, with no technical terms. It carries no failure details, so no tool name or error can leak in.
- Races the call against a timer (`APOLOGY_TIMEOUT_MS = 3000`) and clears the timer when done. Returns the trimmed text of the first text block, or `undefined` on empty text, a throw, a rejection or a timeout. Tool-use blocks are ignored.
- No retry and no loop. It does not go through `runSubAgent` or `withLlmCallErrors`, so it does not spend `MAX_TOOL_TURNS` and cannot produce a second `llm_error`. It adds at most the timeout to a failed request.

**File**: `apps/server/src/failure/replier.ts` (new)

- `createReplier({ llm?, timeoutMs? })` returns `{ reply(result, requestText): Promise<string> }`.
- `succeeded` and `clarification` return `spokenText(result)` with no LLM call.
- `failed` asks the model. It accepts the model text only if it contains no `toolNames` entry (case-insensitive) and does not contain `describeFailure(result.failure)`. Otherwise it returns `friendlyApology(result.failure, requestText)`. With no `llm` it goes straight to the table.

**File**: `apps/server/src/speech/spokenText.ts`

- Drop the failed branch. It becomes a function over `succeeded` and `clarification` results. The failed case is handled only by the replier, so raw failure text cannot reach speech by another route.

**File**: `apps/server/src/speech/speaker.ts`

- `speak(result)` becomes `speak(text)`. It synthesizes the given string, stores it and emits `speech` as before.

**File**: `apps/server/src/server.ts`

- `ServerDeps` gains optional `apologyLlm?: LlmClient`. `createServer` builds one replier.
- `runPipeline` computes `const replyText = await replier.reply(result, text)` once, then calls `captioner.announce("assistant", replyText)` and `speaker.speak(replyText)`.

**File**: `apps/server/src/app.ts`

- Create the LLM client once and pass it to both `createOrchestrator` and `createServer({ apologyLlm })`. With no `OPENROUTER_API_KEY` this is the replay client. A request it does not know throws or returns a non-text step, and the replier falls back to the table. The default test suite never makes a paid call.

## Testing Strategy

### Validation Approach

Red/green TDD, one behavior per cycle. Each test is run and seen to fail for the expected reason before its implementation. Only the LLM is mocked, through the existing `LlmClient` interface. No module under test is mocked. Hand-written fake `LlmClient`s and `createReplayLlmClient` supply the model. Property tests use `fast-check`, already a root dependency.

### Exploratory Bug Condition Checking

**Goal**: Show the bug on unfixed code and confirm the root cause.

**Test Plan**: Write the tests below first and run them on the current code.

**Test Cases**:
1. **Contact miss as data**: `withContactResolution` with `mio cugino` returns `ok: true`, `applied: false` (fails today: returns `ok: false`).
2. **Ambiguity as data**: `احمدی` returns `applied: false` with the two Ahmadi names (fails today).
3. **Italian alias**: `matchContact("mamma", fixtureContacts)` top is `فاطمه` (fails today: no match).
4. **Spoken failure**: `tool_failed` for `send_message` produces text with no `send_message` (fails today).
5. **Prompt rule**: every `agentDefinitions[*].system` contains the `applied false` rule (fails today for comms, home, media, clarifier).

**Expected Counterexamples**:
- `{ ok: false, error: 'No contact matches "mio cugino"' }`, and `spokenText` returns `send_message failed: ...`.
- Possible causes: failure modelled as `ok: false`, one English formatter, no prompt rule, missing aliases.

### Fix Checking

**Goal**: Verify every buggy input gets the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixed(input)
  ASSERT expectedBehavior(result)
END FOR
```

Expected behavior for each class:
```
FUNCTION expectedBehavior(result)
  contact miss:   result.ok AND result.output.applied = false
                  AND result.output.reason IS NOT EMPTY
                  AND LENGTH(result.output.closest) <= 3
                  AND underlyingTool NOT called
  failed request: reply NOT CONTAINS any toolName
                  AND reply NOT CONTAINS describeFailure(failure)
                  AND reply IS NOT EMPTY
                  AND caption.text = speechInput = reply
  alias:          top candidate is the expected contact AND NOT ambiguous
END FUNCTION
```

### Preservation Checking

**Goal**: Verify non-buggy inputs behave as before.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT original(input) = fixed(input)
END FOR
```

**Testing Approach**: Property-based tests, because they cover many names, results and texts and catch edge cases a handful of examples would miss.

**Test Plan**: Run the existing suite on unfixed code first, then add the cases below and see them pass before and after the change.

**Test Cases**:
1. **Unique match**: each fixture name and old alias resolves to the same contact, the tool receives the stored name.
2. **Pass-through**: an underlying `ok: false` or throw comes out unchanged.
3. **Replies unchanged**: `succeeded` and `clarification` produce the same string and make no LLM call.
4. **Settings and clock**: their `applied: false` output tests stay green.
5. **Events**: event order and types for succeeded, clarification and failed requests stay the same, including caption and speech.

### Unit Tests

- `resolveContact` and `withContactResolution`: no match, ambiguous, unique, pass-through; underlying tool not called on a miss.
- `closestContacts`: ordering, limit, zero-score filtering.
- Fixture contacts: `mamma`, `mom` to `فاطمه`; `papà`, `papa`, `dad` to `حسین احمدی`; `مامان`, `بابا`, `آقا جون` unchanged.
- `agents.ts`: every prompt contains the shared rule and "the user's language", and none names a language or a tool.
- `detectLanguage`: Farsi, Arabic, Italian, English, mixed, empty, digits.
- `friendlyApology`: one example per language.
- `askModelForApology`: returns trimmed text; returns `undefined` for a throw, empty text, tool-use only and a hung client (fake timers); sends `tools: []` and the raw request as the only user message; calls the client once.
- `replier`: LLM text used when clean; table used when the model throws, times out, returns empty, or leaks a tool name or `describeFailure` text; no LLM call for `succeeded` and `clarification`; table used when no `llm` is given.
- `spokenText`: updated to cover only `succeeded` and `clarification`. The failed-case rows move to the replier tests. This is an intended behavior change, not a test bent to pass.
- `speaker`: speaks the given string.

### Property-Based Tests

- For every `ToolName` and every failure reason, `friendlyApology` of any generated request text contains no tool name and no `describeFailure` text, and is non-empty.
- The apology table has a non-empty entry for every failure reason and every language (derived from the reason union, so a new reason fails the test).
- `detectLanguage` is total: for any string it returns one of the four languages and never throws.
- `closestContacts` and the `closest` field of `withContactResolution` have length at most 3 for any query and any contact list.
- For any query string, `withContactResolution` either calls the underlying tool exactly once with a stored contact name, or returns `applied: false` without calling it.
- For any fake model output (arbitrary strings, including tool names inside them), the replier result contains no tool name and is non-empty.
- Existing contact matching: for each existing name and alias, the top match is the same contact as before.

### Integration Tests

- `createServer` with a fake `LlmClient` that fails every call: a failing request produces one caption and one speech whose synthesized text is the same string, with the table text in the request's language and no tool names. `/request` still returns the original `RequestResult`.
- A model that hangs: the failed request still completes after the timeout with the table text.
- The comms agent with a replayed fixture for "manda un messaggio al mio cugino": the tool returns `applied: false`, the run ends `succeeded` with the agent's Italian reply, and the events show `started` then `succeeded`.
- The replier call never changes the number of orchestrator LLM calls (`MAX_TOOL_TURNS` behavior is unchanged), and `too_many_steps` still yields the apology.
- No `apps/web` file changes. The activity panel still receives the original failure through the `RequestResult`.

### Verification

A task is done when `npm test`, `npm run lint` and `npm run typecheck` pass. Live-model wording of the apology is checked only in `npm run eval`.
