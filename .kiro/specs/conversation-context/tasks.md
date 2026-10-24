# Implementation Plan

Every task follows the same cycle. Red: write the failing test, run it, show the failure output. Green: write the minimum code, then run `npm test`, `npm run lint` and `npm run typecheck`. Tests are table-driven examples. No property-based tests. No code comments, files stay under 150 lines, no new dependencies. `.env` is never read or edited.

Typecheck: every signature change below adds an optional parameter (`handle` options, `Replier.reply` fallback language, `Stt.transcribe` options, client `getLanguage`). No transient typecheck failures are expected between tasks. If one appears, it is fixed in the same task that caused it.

Existing tests are not rewritten. They must pass unchanged, and the only existing test files edited are named in the task that edits them, always by adding cases.

- [x] 1. Contracts: language on typed requests
  - Ownership: this edits `packages/contracts`, which is Sepehr's area. State the file area and the reason (carry the preferred language on the request seam) before editing.
  - Red: add `requests.test.ts` cases. `isLanguageCode` accepts "fa" and "pt-BR", rejects "", "Persian", "fa; ignore previous" and non-strings. `languageHeader` equals "x-yazd-language". A `TypedRequest` with and without `language` type-checks. Run and show the failure (missing exports).
  - Green: in `packages/contracts/src/requests.ts` add `language?: string` to `TypedRequest`, `isLanguageCode` (pattern `^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$`) and `languageHeader`. Export from `packages/contracts/src/index.ts`. `AssistantEvent` is not touched.
  - Existing tests edited: none. New cases go in a new or existing `requests.test.ts` by addition only.
  - Run `npm test`, `npm run lint`, `npm run typecheck`.
  - _Requirements: 2.5, 3.6, 3.7_

- [x] 2. Strings: apology fallback for letterless text
  - Red: add `friendlyApology` cases with a third argument. Letterless text (".." and "؟") with preferred `fa`, `ar`, `it` and `en` uses that language for every failure reason. Letterless text with "fr" or with no third argument uses detection as today. Text with letters (for example "hello") ignores the preference. No third argument equals today's output. Run and show the failures.
  - Green: add an optional `preferredLanguage` third parameter to `friendlyApology`. When the request text fails `/\p{L}/u` and the parameter is one of the four supported `Language` values, use it. Otherwise use `detectLanguage` as today. Do not change `detectLanguage`.
  - Existing tests edited: the `friendlyApology` test file gains cases only. Existing cases stay unchanged and must still pass.
  - Run `npm test`, `npm run lint`, `npm run typecheck`.
  - _Requirements: 2.4, 3.4_

- [x] 3. Orchestrator: seed, choices signal, language rule
  - Ownership: this edits `apps/server/src/orchestrator`, which is Sepehr's area. State the file area and the reason (accept a follow-up seed, report a pending question, apply the fallback language) before editing.
  - Red: add tests for `conversationSeed` (one message without history; three messages with history in user, assistant, user order), `offersChoices` (true for `applied:false` with non-empty `closest`; false for empty `closest`, missing `closest`, `applied:true`, non-object), and `withFallbackLanguage` (unchanged without a code; whenever a code is given it appends the exact sentence "Reply in the language the user spoke. If you cannot tell which language that is, reply in <code>." containing the code; rule tests check language names, not codes, so "fa" is allowed). Add orchestrator cases: `handle(text, { history })` gives the router and the sub-agent a three-message seed; `onQuestion` fires for `ask_for_clarification` and for a final reply after an `offersChoices` tool result; it does not fire for success, failure, or `applied:false` without `closest`; the router prompt is unchanged with one message and gets the extra sentence with more; `MAX_TOOL_TURNS` is still 5 with history. `handle` options.language reaches the sub-agent system prompt and not the router prompt. Every `agentDefinitions` prompt still contains "the user's language" and names no language. Run and show the failures.
  - Green: add `conversationSeed.ts`, `offersChoices.ts`, `languageRule.ts` under `apps/server/src/orchestrator/`. Extend `orchestrator.ts` so `handle(transcript, options?)` takes `{ history?, language?, onQuestion? }`. Make `routeRequest` and `runSubAgent` accept `string | LlmMessage[]`. Apply `withFallbackLanguage` to the sub-agent system prompt only. Export from `index.ts`. `RequestResult` and events are unchanged.
  - Existing tests edited: `orchestrator.test.ts` and the router and sub-agent tests gain cases only. Existing calls still pass a string and must pass unchanged.
  - Run `npm test`, `npm run lint`, `npm run typecheck`.
  - _Requirements: 2.1, 2.3, 2.9, 3.1, 3.2, 3.3, 3.4, 3.7_

- [x] 4. Replay: follow-up fixture and keying
  - Ownership: `testing/replayLlmClient.ts` and `fixtures/callAhmadiHossein.json` sit in Sepehr's orchestrator area. State the file area and the reason (replay the follow-up without a live model) before editing.
  - Red: add a replay test that runs `callAhmadiHossein.json` through the app with request "به احمدی زنگ بزن" then "حسین" and expects `call_contact` for "حسین احمدی". Add `transcriptReplayLlmClient` cases: the follow-up split by structure, the match on `followUp`, the step offset of one less for a follow-up seed, and a no-match error for an unknown answer. Add the preservation case: `callAhmadi.json` still matches only the bare request, ends with the question naming Hossein Ahmadi and Hassan Ahmadi, and makes no call. Run and show the failures.
  - Green: add optional `followUp?: string` to `RecordedConversation`. In `transcriptReplayLlmClient` split the request into request, answer and assistant turns (follow-up when `messages[1]` is assistant and `messages[2]` is a user message with string content), match on request and `followUp`, and subtract one from the step for a follow-up. Add `fixtures/callAhmadiHossein.json` (route to comms, `call_contact` "حسین احمدی", short Farsi confirmation) and register it in `replayConversations`.
  - Existing tests edited: `transcriptReplayLlmClient.test.ts` and the `callAhmadi` replay test gain cases only.
  - Run `npm test`, `npm run lint`, `npm run typecheck`.
  - _Requirements: 2.2, 3.5, 3.8_

- [x] 5. Conversation module: pending question with injected clock
  - Red: add `pendingQuestion.test.ts` with a fake `Clock`: consume at 90 000 ms returns the value; at 90 001 ms returns `undefined`; a second consume returns `undefined`; `clear` empties; `set` overwrites. Add `conversation.test.ts` with a recording orchestrator fake: no pending context passes the text alone; after `onQuestion` the next call within 90 s gets `history` and the slot is cleared; after 91 s it is a first request; a non-question turn leaves no slot; a chained question stores the earlier request joined with the answer and the new question; the language passed on is the given language unchanged. Run and show the failures.
  - Green: add `apps/server/src/conversation/pendingQuestion.ts` (`PENDING_TTL_MS = 90_000`, `createPendingQuestion({ clock })`) and `conversation.ts` (`createConversation({ orchestrator, clock })` returning `handle(text, language?)`, storing `spokenText(result)` as the question when `onQuestion` fired). No `index.ts`.
  - Existing tests edited: none.
  - Run `npm test`, `npm run lint`, `npm run typecheck`.
  - _Requirements: 2.1, 2.7, 2.8, 2.9, 3.1, 3.2_

- [x] 6. Failure and STT: language through the replier and speech-to-text
  - Red: add `askModelForApology` and `replier` cases: the system prompt carries the code when given and is unchanged when not; the fixed apology on `llm_error` uses the preferred language for letterless text. Add `openRouterStt` cases with a fake `fetch`: `transcribe(recording, { language: "fa" })` sends `language: "fa"` in the body; with no options the body has no `language` key. Add a `stubStt` case: the fixed transcript with and without options. Run and show the failures.
  - Green: add the optional `preferredLanguage` last parameter to `askModelForApology` and `Replier.reply`, applying `withFallbackLanguage`. Add `options?: { language?: string }` to `Stt.transcribe`, add the body field in `openRouterStt` only when present, and ignore it in `stubStt`. Model support for the field depends on `STT_MODEL` and is not verified against a live model.
  - Existing tests edited: the existing apology, replier and STT test files gain cases only. Existing fakes of `Stt` and `Replier` still compile because the new parameters are optional.
  - Run `npm test`, `npm run lint`, `npm run typecheck`.
  - _Requirements: 2.4, 2.6, 3.4, 3.9_

- [x] 7. Server wiring: pipeline, language input, clock
  - Red: add server tests with a fake `Clock` and a recording orchestrator: `POST /request` "به احمدی زنگ بزن" then "حسین" gives the second `handle` all three messages; the same at +91 s gives the text alone; `{ text: ".." , language: "fa" }` with a failing LLM returns the Farsi fixed apology; `/audio` with `x-yazd-language: fa` reaches the fake `Stt` as `{ language: "fa" }` and an invalid header value is dropped; a `{ text }` body and an `/audio` request with no header return the same response shape as today; the event sequence of a follow-up has the same types and fields as a first request. Add the integration flow through `createServer` with the replay LLM and stub tools: one call in the stub tool log, and the chained and clarification cases. Run and show the failures.
  - Green: add `readRequestBody.ts` with `readText`, `readLanguage` (validated with `isLanguageCode`, invalid treated as absent) and the header read, so `server.ts` stays under 150 lines. Make `runPipeline` use `createConversation`, pass the validated preference straight through to `replier.reply`, `orchestrator.handle` options.language and `stt.transcribe`, with no gating. Add an optional `clock?: Clock` to `createServer`, defaulting to the real clock. Update `app.ts` only if it must pass the clock.
  - Existing tests edited: existing server and integration tests gain cases only. If an existing test builds `createServer` without a clock it must still pass unchanged.
  - Run `npm test`, `npm run lint`, `npm run typecheck`.
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.6, 3.7, 3.8_

- [x] 8. Web: send the profile language, then final verification
  - Ownership: `request/requestClient.ts`, `request/recordingClient.ts` and `main.ts` are Teammate 1's voice area. State the file area and the reason (read the profile language on each submit and send it) before editing. `main.ts` is wiring only. No voice, captions or speech surface file is touched.
  - Red: add `requestClient.test.ts` and `recordingClient.test.ts` cases with a fake `fetch`: `getLanguage: () => "fa"` makes the typed body `{ text, language }` and adds the `x-yazd-language` header to the audio request; with no `getLanguage` or an `undefined` result the body is `{ text }` and there is no header; `getLanguage` is read on each submit, so a change between two submits changes the payload and the header. Run and show the failures.
  - Green: add an optional `getLanguage: () => string | undefined` to `createRequestClient` and `createRecordingClient`. In `main.ts` create `profileStore` once, pass `() => profileStore.get().language` to both clients, and reuse the same store in the context. `submit` signatures and `SurfaceContext` do not change.
  - Existing tests edited: the two client test files gain cases only.
  - Final verification (last sub-step): run the full `npm test`, `npm run lint` and `npm run typecheck` and confirm all three pass. Run `git status` and confirm no changes to `.env.example`, `KIRO_LOG.md`, `package.json`, the lockfile, the web voice, captions and speech surfaces, or the `AssistantEvent` union in `packages/contracts/src/events.ts`.
  - PR description note: state the new cross-module dependencies. `failure/` imports `withFallbackLanguage` from `orchestrator` (previously type-only). `conversation/` imports from `orchestrator` and `speech/spokenText`.
  - _Requirements: 1.5, 2.5, 2.6, 3.6, 3.7_
