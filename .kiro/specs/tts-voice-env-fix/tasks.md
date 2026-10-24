# Implementation Plan

Scope: only `apps/server`, `.env.example` and `.kiro/steering/tech.md`. No code comments. Do not read or edit `.env`. Mock only the fetch boundary and never call a paid API. `fast-check` 4.10.2 is already a root devDependency in `package.json`, so no dependency is added.

- [x] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - Voice Required, Format Configurable and Failures Visible
  - **CRITICAL**: These tests MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: These tests encode the expected behavior and will validate the fix when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Use property-based tests for the voice rules (any whitespace-only voice, any surrounding whitespace on a non-blank voice), the format rules (any invalid format, valid formats with surrounding whitespace) and the `pcmToWav` rules (any byte array); use concrete cases for logging and `.env.example`
  - Add to `apps/server/src/tts/selectTts.test.ts`:
    - Missing voice: `selectTts({ OPENROUTER_API_KEY, TTS_MODEL })` throws `TTS_VOICE must be set when OPENROUTER_API_KEY is set`
    - Blank voice: for any whitespace-only `TTS_VOICE`, `selectTts` throws the same error
    - Voice sent: with `TTS_VOICE` of any non-blank string with surrounding whitespace, the recorded fetch body has `voice` equal to the trimmed value
    - Format sent: with `TTS_FORMAT` `" pcm "` the recorded fetch body has `response_format` `"pcm"`
    - PCM returns WAV: with `TTS_FORMAT` `pcm` and a fake fetch returning raw PCM bytes, the result has mime type `audio/wav`, length `44 + n`, and starts with `RIFF`
    - Invalid format: for any `TTS_FORMAT` that is non-blank and not exactly `mp3` or `pcm` after trimming (including `PCM`, `Mp3`, `wav`), `selectTts` throws `TTS_FORMAT must be mp3 or pcm`
  - Add to `apps/server/src/tts/openRouterTts.test.ts`: with `format: "pcm"` the recorded body has `response_format` `"pcm"` and the result is `{ data: pcmToWav(bytes), mimeType: "audio/wav" }`
  - Create `apps/server/src/tts/pcmToWav.test.ts` (new module test file; red because `pcmToWav.ts` does not exist yet), using unit tests and `fast-check`:
    - Empty input gives exactly 44 bytes with `ChunkSize` 36 and `Subchunk2Size` 0
    - `[1, 2, 3, 4]` gives 48 bytes, `readUInt32LE(4)` is 40, `readUInt32LE(40)` is 4, and `subarray(44)` is `[1, 2, 3, 4]`
    - Markers `RIFF`, `WAVE`, `fmt `, `data` sit at offsets 0, 8, 12, 36
    - Fields at offsets 16, 20, 22, 24, 28, 32, 34 equal 16, 1, 1, 24000, 48000, 2, 16
    - For any byte array: length is `44 + input.length`, `readUInt32LE(4)` is `36 + input.length`, `readUInt32LE(40)` is `input.length`, `subarray(44)` equals the input, and two inputs of equal length share an identical header
    - The input buffer is not mutated
  - Add a server test in `apps/server/src/server.test.ts` (or the existing server test file): a speaker that rejects with an error makes `console.error` get called with the error message, the API key is never printed, and the request still completes
  - Update `apps/server/src/envExample.test.ts` to expect `TTS_VOICE` directly after `TTS_MODEL` and `TTS_FORMAT` directly after `TTS_VOICE`
  - Run `npm test` on UNFIXED code and show the red output
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bug exists)
  - Document counterexamples (for example: `selectTts` returns a client when the voice is absent or the format is `PCM`, the request body voice is `"alloy"` and `response_format` is `"mp3"`, PCM bytes come back with no WAV header, `pcmToWav` module is missing, nothing is logged on rejection, `.env.example` lacks `TTS_VOICE` and `TTS_FORMAT`)
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.2, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing TTS Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on UNFIXED code, for inputs where `isBugCondition` is false:
    - Blank or absent `OPENROUTER_API_KEY` returns the stub TTS and makes no fetch call, regardless of `TTS_MODEL`, `TTS_VOICE` and `TTS_FORMAT` (including an invalid format)
    - Key set with blank or absent `TTS_MODEL` throws `TTS_MODEL must be set when OPENROUTER_API_KEY is set`
    - The speech request posts to `/audio/speech` with the model, input, `mp3` format and bearer header, and returns audio data and mime type
    - Default format (no `format` configured) sends `response_format` `"mp3"`; the same holds through `selectTts` when `TTS_FORMAT` is blank, missing or `mp3`
    - For any bytes returned under `mp3` or the default format, the result data equals the provider bytes and the mime type equals the provider `content-type`, falling back to `audio/mpeg` when absent
    - A non-OK status throws `OpenRouter speech failed (<status>): <message>`
    - A rejecting speaker still delivers captions and finishes the request
    - Successful speech publishes the speech event
    - `.env.example` lists every other variable in existing order with empty values
  - Write property-based tests capturing these patterns, passing an explicit `voice` to `createOpenRouterTts` where needed so they stay valid after the type change
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 3. Fix for silent TTS caused by missing TTS_VOICE and unsupported TTS format

  - [x] 3.1 Add `pcmToWav.ts`
    - Create `apps/server/src/tts/pcmToWav.ts` exporting pure `pcmToWav(pcm: Buffer): Buffer`
    - Allocate `44 + pcm.length`, write the header at the offsets in the design layout table, then copy `pcm` at offset 44
    - Name sample rate, channels and bits per sample at module top and derive byte rate and block align from them
    - No I/O, no clock, no randomness
    - _Bug_Condition: isBugCondition(input) where trim(TTS_FORMAT) = "pcm"_
    - _Expected_Behavior: result is header plus unchanged PCM, length 44 + n_
    - _Preservation: module is new and only used on the pcm path_
    - _Requirements: 2.7, 2.9_

  - [x] 3.2 Require voice and add format option in `openRouterTts.ts`
    - In `apps/server/src/tts/openRouterTts.ts` change `voice?: string` to `voice: string`, delete `DEFAULT_VOICE` and the destructuring default
    - Export `type TtsFormat = "mp3" | "pcm"` and add optional `format?: TtsFormat` to `OpenRouterTtsConfig`, defaulting to `"mp3"`
    - Delete `RESPONSE_FORMAT` and send `response_format: format`
    - Add helper `toSpeechAudio(format, bytes, contentType)`: for `pcm` return `{ data: pcmToWav(bytes), mimeType: "audio/wav" }`, otherwise bytes and `content-type` falling back to `audio/mpeg`
    - Keep the file under 150 lines
    - _Bug_Condition: isBugCondition(input) from design_
    - _Expected_Behavior: no hardcoded voice or format; pcm returns audio/wav_
    - _Preservation: request shape, mp3 passthrough and non-OK error format unchanged_
    - _Requirements: 2.3, 2.6, 2.7, 3.3, 3.4, 3.8, 3.9_

  - [x] 3.3 Read and validate `TTS_VOICE` and `TTS_FORMAT` in `selectTts.ts`
    - In `apps/server/src/tts/selectTts.ts`, after the model check, read `env.TTS_VOICE?.trim()` and throw `TTS_VOICE must be set when OPENROUTER_API_KEY is set` when blank
    - Add `parseFormat(env.TTS_FORMAT)` in the same file: trim, return `"mp3"` for blank or missing, return the value when exactly `"mp3"` or `"pcm"` (case-sensitive), otherwise throw `TTS_FORMAT must be mp3 or pcm`
    - Order of checks: model, then voice, then format, all only when the key is set
    - Call `createOpenRouterTts({ apiKey, model, voice, format, fetch: options.fetch })`
    - Keep the stub path free of voice and format requirements
    - _Bug_Condition: isBugCondition(input) from design_
    - _Expected_Behavior: expectedBehavior(result) from design_
    - _Preservation: stub fallback and `TTS_MODEL` error order_
    - _Requirements: 2.1, 2.2, 2.6, 2.8, 3.1, 3.2_

  - [x] 3.4 Log speech failures in `server.ts`
    - Replace `app.log.error(error)` in the speech `.catch` with `console.error` of a short label plus `error instanceof Error ? error.message : String(error)`
    - Never log the error object or any secret
    - Keep captions and request completion unchanged on failure
    - _Bug_Condition: speakResult rejects with error E_
    - _Expected_Behavior: console.error called with message of E, no secret printed_
    - _Preservation: captions delivered and request finishes normally_
    - _Requirements: 2.4, 3.5, 3.6_

  - [x] 3.5 Document `TTS_VOICE` and `TTS_FORMAT`
    - In `.env.example` insert `TTS_VOICE=` directly after `TTS_MODEL=`, then `TTS_FORMAT=` directly after `TTS_VOICE=`, both empty
    - In `.kiro/steering/tech.md` add `TTS_VOICE` then `TTS_FORMAT` after `TTS_MODEL` in the Variables line
    - Keep every other variable in its existing order with empty values
    - _Requirements: 2.5, 3.7_

  - [x] 3.6 Update existing tests that would now throw or mismatch
    - `apps/server/src/clock/clockWiring.test.ts` and `apps/server/src/settings/withSettings.app.test.ts`: add `TTS_VOICE: "test-voice"` next to `TTS_MODEL: "test/tts"`; leave `TTS_FORMAT` unset so it defaults to `mp3`
    - `apps/server/src/tts/selectTts.test.ts`: the existing OpenRouter case gains `TTS_VOICE: "v1"` and asserts body `voice` `"v1"` and `response_format` `"mp3"`; the `TTS_MODEL` refusal test stays unchanged to prove the model check runs first
    - `apps/server/src/tts/openRouterTts.test.ts`: the first test currently expects `voice: "alloy"` with no voice configured, which was the old default; this expectation is wrong after the fix. Pass `voice: "v1"` in all three `createOpenRouterTts` calls and expect `voice: "v1"` in the body. State explicitly in the change summary that this test was updated because the default voice was removed, not to hide a failure
    - Grep `apps/server/src` for any other env setting both `OPENROUTER_API_KEY` and `TTS_MODEL` (for example `integration.test.ts`) and add a voice where needed
    - Add an integration test: `TTS_FORMAT` `pcm` with a fake fetch returning raw PCM stores audio starting with `RIFF`, mime type `audio/wav`, and publishes the speech event
    - Add an integration test: `buildServer` with an invalid `TTS_FORMAT` and a key set fails at startup with `TTS_FORMAT must be mp3 or pcm`
    - _Requirements: 2.1, 2.2, 2.6, 2.7, 2.8_

  - [x] 3.7 Verify bug condition exploration tests now pass
    - **Property 1: Expected Behavior** - Voice Required, Format Configurable and Failures Visible
    - **IMPORTANT**: Re-run the SAME tests from task 1 - do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms bug is fixed)
    - Show the green output after the red output from task 1
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [x] 3.8 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing TTS Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run `npm test`, `npm run lint` and `npm run typecheck`; all three must pass
  - Do not read or edit `.env`. The user must add `TTS_VOICE=<voice id>` to their local `.env` themselves, and `TTS_FORMAT=pcm` for the pcm-only model `google/gemini-3.8-flash-tts`, since startup now fails with `TTS_VOICE must be set when OPENROUTER_API_KEY is set` when the voice is missing and the model rejects `mp3`
  - Ask the user if questions arise
