# Conversation Context Bugfix Design

## Overview

The server treats every request as the first one. `runPipeline` in `apps/server/src/server.ts` passes only the request text to `orchestrator.handle`, so an answer such as "حسین" reaches `routeRequest` and `runSubAgent` with no original request and no question. Separately, nothing carries the profile's preferred language to the server, so unclear input ("..", "؟", a one-word noise) gets a reply in whatever language the model picks, and the fixed apology falls back to English.

The fix has two parts that share one plumbing path (web client, then server, then orchestrator and replier):

1. A single-user pending-question store with a 90 second TTL on an injected `Clock`. When a turn ends in a question, the server remembers the request and the question. The next turn consumes it and gives the orchestrator the three-message exchange (request, question, answer).
2. An optional preferred language, carried as a validated language code. It is always passed to the sub-agent prompt and the apology replier as a fallback sentence, and the model decides whether the text is unclear. It also reaches the speech-to-text call.

`RequestResult`, `AssistantEvent` and the response shape do not change. All additions are optional and additive, so a request with no pending context and no language behaves exactly as today.

## Glossary

- **Bug_Condition (C)**: A request that follows a question asked by yazd within 90 seconds, or a request with a preferred language present whose text the model cannot place in a language.
- **Property (P)**: For the first case, the orchestrator input contains the original request, the question and the answer. For the second, the prompt carries the fallback sentence with the preferred language code, so the model replies in it.
- **Preservation**: Behavior for every request outside C: same orchestrator input, same prompts, same result, same events, same response shape.
- **Pending question**: `{ request, question }` held by the conversation context after a turn that ended in a question.
- **Question signal**: A server-side-only notification from `runSubAgent` that the turn ended asking the user something. It is not part of `RequestResult` or `AssistantEvent`.
- **Unclear language**: Text whose language the model cannot tell. The model decides. No code classifies it.
- **Preferred language**: The validated language code (`isLanguageCode`) from the web profile. It is passed straight through, with no gating.
- **Fallback sentence**: "Reply in the language the user spoke. If you cannot tell which language that is, reply in <preferred language>." The code is data. The sentence names no language.
- **Follow-up seed**: The three LLM messages `[user request, assistant question, user answer]` handed to the router and the sub-agent.
- **runPipeline** (`apps/server/src/server.ts`): Shared handler for `/request` and `/audio`.
- **handle** (`apps/server/src/orchestrator/orchestrator.ts`): Routes, runs the sub-agent, emits state and agent events.
- **runSubAgent** (`apps/server/src/orchestrator/runSubAgent.ts`): The sub-agent tool loop bounded by `MAX_TOOL_TURNS`.
- **transcriptReplayLlmClient** (`apps/server/src/llm/transcriptReplayLlmClient.ts`): Replay client that matches a `RecordedConversation` on the first user message and picks a response by step.

## Bug Details

### Bug Condition

The bug manifests in two situations. In the first, the previous turn ended in a question (a `clarification` result, or a `succeeded` comms reply that lists matching contacts) and the user answers within 90 seconds. `runPipeline` calls `orchestrator.handle(text)` with the answer alone. In the second, `detectLanguage` falls back to `"en"` for text with no usable letters, `friendlyApology` uses that result, and the orchestrator and apology prompts say only "the user's language", so the model guesses. No code path carries the web profile's `language`.

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X of type Request { text, language?, previous }
  OUTPUT: boolean

  RETURN (X.previous.endedWithQuestion AND X.previous.ageMs <= 90000)
      OR (X.language is present AND modelCannotTellLanguage(X.text))
END FUNCTION
```

`modelCannotTellLanguage` is decided by the model at run time, not by code. The fix does not evaluate it. It always sends the preferred language, and the model applies it only when it cannot tell.

### Examples

- "به احمدی زنگ بزن" ends with "می‌خواهید با کدام یک تماس بگیرم: حسین احمدی یا حسن احمدی؟" (status `succeeded`, agent `comms`). Ten seconds later the user says "حسین". Expected: the orchestrator receives all three and ends with `call_contact` for "حسین احمدی". Actual: `handle("حسین")` sees only the name and asks what to do with it.
- The same exchange, but the answer arrives after 120 seconds. Expected and actual: "حسین" is a first request.
- "call Ahmadi" is answered "Hossein" with preferred language "fa". The prompt tells the model to reply in the language the user spoke, so the reply follows the text. The preference is only the fallback.
- The text is "xqzv" with preferred language "fa". Expected: the sub-agent prompt carries the fallback sentence with "fa", and the model decides. No code classifies "xqzv".
- The text is ".." with preferred language "fa" and the model call fails. Expected: the fixed Farsi `llm_error` apology, because ".." has no letters. Actual: the English one.
- The text is "hello" with preferred language "fa" and the model call fails. Expected: the English fixed apology, because the text has letters and `detectLanguage` decides, as today.
- A recording whose transcript is "" is already rejected with 422 and is unaffected.
- A `get_time` result with `applied: false` and no `closest` list is not a question. The next request is a first request.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- A request with no pending context passes only its text to the router and the sub-agent.
- Successful actions, failures and spoken answers that are not questions return the same result and leave no pending context.
- The prompt still tells the model to reply in the language the user spoke. The preference is only a fallback.
- With no preferred language, prompts, apologies and STT bodies are byte-identical to today's.
- `callAhmadi.json` still replays on its own and ends with the question naming Hossein Ahmadi and Hassan Ahmadi, with no call.
- A `/request` body with only `text` and an `/audio` request with no language header are accepted and return the same response shape.
- `AssistantEvent` types and fields are identical. `RequestResult` is identical.
- With `OPENROUTER_API_KEY` unset, the app runs on stubs and replay with no network call. The stub STT still returns its fixed transcript.

**Scope:**
All requests where no question is pending and no preferred language is sent are unaffected.

## Hypothesized Root Cause

1. **Stateless pipeline**: `runPipeline(text)` has no memory between calls, and `Orchestrator.handle(transcript: string)` takes one string.
   - `routeRequest` and `runSubAgent` each build `messages: [{ role: "user", content: transcript }]`.
2. **No question signal**: In the Ahmadi flow the question is the sub-agent's final text after a tool result with `applied: false` and a `closest` list, so the result is `succeeded`. Only `ask_for_clarification` produces `status: "clarification"`, so a status check alone misses the main case.
3. **Missing language channel**: `TypedRequest` is `{ text }`, `/audio` has no language input, `Stt.transcribe` takes only the recording, and `Replier.reply`, `askModelForApology` and `friendlyApology` take no preference.
4. **Silent fallback in `detectLanguage`**: it returns `"en"` for text with no letters, which `friendlyApology` treats as a real detection.
5. **Replay client keying**: `transcriptOf` reads only the first user message and `stepOf` counts every assistant message. A follow-up seed would collide with `callAhmadi.json` and offset the step by one.

## Correctness Properties

Property 1: Bug Condition - Follow-up completes the original request

_For any_ request that arrives within 90 seconds of a turn that ended in a question (a clarification result, or a final reply after a tool result with `applied: false` and non-empty `closest`), the fixed server SHALL give the router and the sub-agent a seed that contains the original request, the question and the answer, and SHALL clear the pending context.

**Validates: Requirements 2.1, 2.2, 2.8, 2.9**

Property 2: Bug Condition - Preferred language is the fallback

_For any_ request that carries a valid preferred language, the fixed server SHALL append the fallback sentence with that code to the sub-agent system prompt and to the model apology prompt, SHALL use the code as the fixed apology language when the request text has no letters and the code is one of fa, ar, it or en, and SHALL send the same code in the STT language field and from the web client with every typed and voice request.

**Validates: Requirements 2.3, 2.4, 2.5, 2.6**

Property 3: Bug Condition - Stale or non-question context is discarded

_For any_ request that arrives more than 90 seconds after a question, or after a turn that did not end in a question, the fixed server SHALL treat it as a first request with the text alone.

**Validates: Requirements 2.7, 2.9**

Property 4: Preservation - Requests outside the bug condition

_For any_ request where the bug condition does NOT hold, the fixed server SHALL produce the same orchestrator input, prompts, result, events and response shape as the original server, preserving the single-string input, the unchanged prompts and apologies when no preferred language is sent, and the stub and replay behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9**

## Fix Implementation

### Design Decisions

**(a) Detecting that the previous request ended in a question**

| Option | Tradeoff |
|---|---|
| `?` or `؟` check on the reply | Language-specific. Fails for punctuation-less languages and for Farsi variants. Rejected. |
| New field on `RequestResult` (for example `askedQuestion`) | Changes the contract, the guard, the HTTP response and every web consumer. Rejected. |
| Return `{ result, askedQuestion }` from `handle` | Changes the `Orchestrator` type used by every existing orchestrator test and fake. More invasive than needed. |
| Hidden property or `WeakSet` keyed on the result object | No type churn, but implicit and easy to break by cloning the result. Rejected. |
| **Optional `onQuestion` callback in a second argument to `handle`** | Chosen. Existing callers and tests compile unchanged. The signal is explicit, server-side only, and cannot leak into the JSON response. |

Chosen: `handle(transcript, options?)` where `options.onQuestion` is called by `runSubAgent` when the turn ends asking something. It fires in two cases:

1. The run ends via `ask_for_clarification` (status `clarification`).
2. The run ends with the final text reply and the last executed tool result offers choices. `offersChoices(output)` is true when `output.applied === false` and `output.closest` is a non-empty array. This is the exact output `withContactResolution` produces for `ambiguous` and `no_match`.

`applied: false` alone is not used. It also covers the clock-unavailable case, which `agents.ts` tells the model to state and not to ask about, and it would wrongly combine the next unrelated request with a stale one. The `closest` list is data, not text, so detection works in any language. The cost is that a future tool must return a `closest` list to opt in. That is a one-line convention and is documented by the `offersChoices` test.

**(b) How the combined input reaches the orchestrator and the replay fixtures**

| Option | Tradeoff |
|---|---|
| One combined string such as "Request: … Question: … Answer: …" | Hardcodes English labels into model input, mixes data with instructions, and couples the replay key to a format string. Simple for the fixture. Rejected. |
| **Three messages: user request, assistant question, user answer** | Chosen. This is the native chat shape. The router and the sub-agent both see the whole exchange. No prompt language is added. |

`Orchestrator.handle(transcript, options?)` keeps `transcript` as the new answer. With `options.history = { request, question }` it builds the follow-up seed through `conversationSeed.ts`. Without history the seed is the single message it is today. `routeRequest(llm, seed)` and `runSubAgent(deps, agent, seed, ...)` accept `string | LlmMessage[]` so existing tests still pass a string. When the seed has more than one message, the router system prompt gets one appended sentence telling it to route by the whole exchange. With one message the prompt is unchanged. `MAX_TOOL_TURNS` counts tool turns inside the run only, so history costs none of the 5.

Replay keying. `RecordedConversation` gains an optional `followUp?: string`. `transcriptReplayLlmClient` splits the request into `{ request, answer?, assistantTurns }`:

- A follow-up is detected structurally: `messages[1]` is an assistant message and `messages[2]` is a user message with string content. A normal tool loop has an array of tool results at `messages[2]`, so the two cannot be confused.
- The match key is `transcript === request` and `followUp === answer`. Existing fixtures have no `followUp` and a normal request has no answer, so `callAhmadi.json` still matches only the bare request.
- The step is `1 + assistantTurns` as today, minus one when a follow-up seed is present, because the question message is history, not a model turn.

The new fixture `fixtures/callAhmadiHossein.json` has `transcript: "به احمدی زنگ بزن"`, `followUp: "حسین"`, and responses `route_to_agent comms`, `call_contact { contact: "حسین احمدی" }`, then a short Farsi confirmation. It is added to `replayConversations`.

Chained questions: if a combined turn ends in another question, the new pending request is the earlier request and the answer joined with a space, and the question is the new one. The seed stays three messages and replay matching stays simple. The cost is that the joined user text is not a single utterance. That is acceptable inside a 90 second window and avoids an unbounded history.

**(c) The preferred language path**

- No gate. The validated preferred language goes straight from the request to `orchestrator.handle` options, `replier.reply` and `stt.transcribe`. The model decides what is unclear, so "xqzv" gets the preferred language too, with no language-specific heuristic. Requirement 3.3 holds because the sentence still tells the model to reply in the language the user spoke.
- `packages/contracts/src/requests.ts`: `TypedRequest = { text: string; language?: string }`, plus `isLanguageCode(value)` (matches `^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$`) and `languageHeader = "x-yazd-language"`. The code is placed into model prompts, so it is validated as data. An invalid value is dropped as if absent, never a 400, to keep older clients working.
- `/request`: reads `body.language`. `/audio`: reads the `x-yazd-language` header, since the body is raw binary. A query parameter was rejected because it changes the URL the web client and tests already use.
- `apps/server/src/orchestrator/languageRule.ts` exports `withFallbackLanguage(system, code?)`. With no code it returns `system` unchanged. With a valid code it appends exactly: "Reply in the language the user spoke. If you cannot tell which language that is, reply in <code>." The code is data and the sentence names no language. `runSubAgent` applies it to the agent system prompt. The router prompt is not changed. Every agent prompt still contains "the user's language" and names no language. The existing rule tests that forbid language names allow the code (for example "fa"), so tests check against language names, not codes.
- `friendlyApology(failure, requestText, preferredLanguage?)`: the fixed table cannot ask a model. It uses `detectLanguage(requestText)` as today, except when the request text contains no letters at all (`/\p{L}/u` fails). That test is script-neutral and is not a language heuristic. In that case it uses the preferred language if it is one of fa, ar, it or en. Otherwise (including "fr") it uses detection as today. Tradeoff: an English request failing offline still gets the English apology, and a letter-bearing gibberish request offline follows `detectLanguage` (English). That is acceptable because the model path handles the unclear case when the LLM is up. The model apology always receives the code.
- `askModelForApology(llm, requestText, timeoutMs?, preferredLanguage?)` applies `withFallbackLanguage` to its system prompt. `Replier.reply(result, requestText, preferredLanguage?)` forwards it to both paths.
- `Stt.transcribe(recording, options?: { language?: string })`. `openRouterStt` adds `language` to the JSON body only when present. `stubStt` ignores it. `/audio` passes the validated preference directly, since the text is not known before transcription. Model support for the field depends on `STT_MODEL`. Sending it is the specified behavior and is not verified against a live model here.

**(d) Conversation context module**

`apps/server/src/conversation/` holds three small files:

- `pendingQuestion.ts`: `PENDING_TTL_MS = 90_000` and `createPendingQuestion({ clock })` returning `set(pending)`, `consume()` and `clear()`. `set` stores the value with `clock.now().getTime()`. `consume` always clears and returns the value only if its age is `<= PENDING_TTL_MS`. A single slot, because there is a single user.
- `conversation.ts`: `createConversation({ orchestrator, clock })` returning `handle(text, language?)`. It consumes the pending slot, calls `orchestrator.handle(text, { history, language, onQuestion })`, and after the call sets a new pending slot only if `onQuestion` fired. The stored question is `spokenText(result)`. It does not depend on `result.status`, so both question cases are handled by the one signal.
- `index.ts` is not added. Callers import the two files directly.

`createServer` gets an optional `clock?: Clock`, defaulting to the real clock, so server tests inject a fake. Overlapping requests are not synchronized. Consume-at-start means the second of two simultaneous requests sees no context, which is the safe direction for one user.

**(e) Web side and cross-area files**

- `createRequestClient({ fetch, url, getLanguage })` and `createRecordingClient({ fetch, url, getLanguage })` take an optional `getLanguage: () => string | undefined`. It is called on each submit, so a language changed by voice applies at once. The typed body is `{ text }` or `{ text, language }`. The audio request adds the `x-yazd-language` header only when a language is present. `submit` signatures and `SurfaceContext` do not change, so no surface changes.
- `main.ts` creates `profileStore` once, passes `() => profileStore.get().language` to both clients, and reuses the same store in the context.

**Cross-area files** (the rules require saying so before editing outside the current area):

| Area | Owner | Files |
|---|---|---|
| `packages/contracts`, `apps/server/src/orchestrator` | Sepehr | `requests.ts`, `index.ts` (contracts); `orchestrator.ts`, `routeRequest.ts`, `runSubAgent.ts`, new `conversationSeed.ts`, `offersChoices.ts`, `languageRule.ts`, `index.ts`, `testing/replayLlmClient.ts`, `fixtures/callAhmadiHossein.json` |
| Voice in `apps/web` (Teammate 1) | Teammate 1 | `request/requestClient.ts`, `request/recordingClient.ts` and their tests, `main.ts` wiring only |
| Shared server and packages | none assigned | `packages/strings`, `apps/server/src/{server,app,readRequestBody}.ts`, `conversation/`, `failure/`, `stt/`, `llm/` |

No voice, captions or speech surface file is touched. New cross-module dependency to state in the PR: `failure/` imports `withFallbackLanguage` from `orchestrator` (previously type-only), and `conversation/` imports from `orchestrator` and `speech/spokenText`.

### Changes Required

**Task sizing.** Eight tasks, each red then green, each under 150 lines per file:

1. **Contracts**: `TypedRequest.language`, `isLanguageCode`, `languageHeader`, exports, tests.
2. **Strings**: `friendlyApology` third argument for letterless text, tests.
3. **Orchestrator**: `conversationSeed`, `offersChoices`, `languageRule`, `handle` options, `routeRequest` and `runSubAgent` seeds, `onQuestion`, `MAX_TOOL_TURNS` unchanged, tests.
4. **Replay**: `followUp` on `RecordedConversation`, structural split in `transcriptReplayLlmClient`, new fixture, `replayConversations`, replay test plus `callAhmadi` preservation test.
5. **Conversation**: `pendingQuestion.ts`, `conversation.ts`, fake-clock tests.
6. **Failure and STT**: `askModelForApology`, `replier`, `Stt` options, `openRouterStt`, `stubStt`, tests.
7. **Server wiring**: `readRequestBody.ts` (extracts `readText`, adds `readLanguage` and header read so `server.ts` stays under 150 lines), `runPipeline` uses `conversation` and passes the validated language through, `clock` dep, `app.ts`, tests.
8. **Web**: `getLanguage` in both clients, `main.ts`, tests.

Each task ends only when `npm test`, `npm run lint` and `npm run typecheck` pass.

## Testing Strategy

### Validation Approach

Red/green TDD per task. Every test uses hand-written fakes at the boundaries: a recording `LlmClient`, a fake `Stt`, a fake `fetch`, and a fake `Clock`. No paid API is called and no live model is used in `npm test`. Property-based tests are not used for this fix, as requested. The "for any" properties are covered by table-driven examples over the cases listed below.

### Exploratory Bug Condition Checking

**Goal**: Show the bug on unfixed code before changing it.

**Test Plan**: Write the tests below first. Each fails for the stated reason on the current code.

**Test Cases**:
1. **Follow-up reaches orchestrator alone**: with a recording orchestrator fake, `POST /request` "به احمدی زنگ بزن", then "حسین". Assert the second call received all three. Fails: `handle` was called with "حسین" only.
2. **Replay follow-up**: replay `callAhmadiHossein.json` through `createApp`. Fails: there is no matching conversation for "حسین".
3. **Letterless text apology**: `POST /request` with text ".." and `language: "fa"` and a failing LLM. Fails: the English apology is returned.
4. **STT language**: fake `fetch` captures the OpenRouter body for `transcribe(recording, { language: "fa" })`. Fails: the body has no `language`.
5. **Web payload**: fake `fetch` captures `submit("..")` with `getLanguage: () => "fa"`. Fails: the body is `{ text }`.

**Expected Counterexamples**:
- The second `handle` call carries one string and the router sees one message.
- Possible causes: stateless `runPipeline`, a string-only `Orchestrator.handle`, and no language field anywhere.

### Fix Checking

**Goal**: Verify that for every input in C the fixed code produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedServer(input)
  ASSERT expectedBehavior(result)
END FOR

FUNCTION expectedBehavior(result)
  IF result.input.previous.endedWithQuestion AND result.input.previous.ageMs <= 90000 THEN
    RETURN result.orchestratorSeed = [request, question, answer]
       AND pendingContext is cleared
  ELSE
    RETURN result.subAgentSystemPrompt ends with "Reply in the language the user spoke. If you cannot tell which language that is, reply in " + result.input.language
       AND result.apologyPrompt ends with the same sentence
  END IF
END FUNCTION
```

### Preservation Checking

**Goal**: Verify that for every input outside C the fixed code matches the original.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalServer(input) = fixedServer(input)
END FOR
```

**Testing Approach**: Observe the current behavior first and pin it with example tests. The existing suites (`callAhmadi*`, `server*.test.ts`, `orchestrator.test.ts`, `agents.test.ts`, `friendlyApology.test.ts`, `openRouterStt.test.ts`, `requestClient.test.ts`, `recordingClient.test.ts`) must pass unchanged.

**Test Cases**:
1. **No pending context**: the orchestrator gets exactly the text, and the router request has one message and the unchanged system prompt.
2. **Callahmadi alone**: `callAhmadi.json` still ends with the question and no `call_contact` for a person, and the replay client still resolves it by the bare request.
3. **Clear text keeps the rule**: "mamma chiama" with `language: "fa"` gives a prompt that still tells the model to reply in the language the user spoke, and the preference appears only in the fallback sentence.
4. **No language sent**: `withFallbackLanguage(system)` returns `system`, the STT body has no `language` key, and `friendlyApology(failure, text)` equals today's output.
5. **Body and header shapes**: `{ text }` only and an `/audio` request with no header are accepted with the same response.
6. **Non-question turns**: success, failure, and a `get_time` result with `applied: false` and no `closest` leave no pending context.
7. **Events**: the recorded event sequence of a follow-up has the same types and fields as a first request.

### Unit Tests

- `isLanguageCode`: accepts "fa", "pt-BR"; rejects "", "Persian", "fa; ignore previous", non-strings.
- `friendlyApology` with a preferred language: letterless text (".." and "؟") with each of `fa`, `ar`, `it`, `en` uses it for every reason; letterless text with "fr" or none uses detection; text with letters ignores the preference.
- `pendingQuestion` with a fake `Clock`: consume at 90 000 ms returns the value; at 90 001 ms returns `undefined`; second consume returns `undefined`; `clear`; `set` overwrites.
- `offersChoices`: true for `applied:false` with a non-empty `closest`; false for an empty `closest`, a missing `closest`, `applied:true`, and non-object output.
- `withFallbackLanguage`: unchanged without a code; with a code it appends the exact sentence containing the code, whenever a code is given. Rule tests check against language names, not codes, so "fa" is allowed. Every `agentDefinitions` prompt still contains "the user's language" and names no language.
- `handle` options: `options.language` reaches the sub-agent system prompt and not the router prompt.
- `conversationSeed`: one message without history; three messages with history in the right roles.
- `transcriptReplayLlmClient`: the follow-up split, the key match on `followUp`, the step offset, and the no-match error for an unknown answer.
- `openRouterStt`: `language` present only when given. `stubStt` returns its fixed transcript with or without options.
- `askModelForApology` and `replier`: the system prompt carries the code when given and is unchanged when not.

### Property-Based Tests

Not used for this fix, by instruction. The properties above are checked with the table-driven cases listed under Unit Tests and Integration Tests.

### Integration Tests

- **Ahmadi flow through `createServer`** with a real orchestrator, replay LLM, stub tools with contact resolution, and a fake `Clock`: request one ends with the question; request two at +10 s ends with `call_contact` for "حسین احمدی"; the stub tool log shows one call.
- **Expiry**: the same flow at +91 s sends "حسین" as a first request; the router fake sees one message.
- **Chained question**: a second question after a follow-up stores the joined request and the new question; a third request receives them.
- **Clarification path**: a turn ending in `ask_for_clarification` is followed by an answer that arrives with all three messages.
- **Language flow**: `/audio` with `x-yazd-language: fa` reaches the fake `Stt` as `{ language: "fa" }`; the sub-agent system prompt ends with the fallback sentence carrying "fa" for any transcript, including "xqzv"; for a ".." transcript with a failing LLM the Farsi fixed apology is returned.
- **Web clients**: with a fake `fetch`, `getLanguage` is read on each submit, and a profile change between two submits changes the payload and the header.
- **`main.ts`**: covered by typecheck and the existing DOM test context. The two clients are not constructed in tests, so wiring is one reviewed line.
