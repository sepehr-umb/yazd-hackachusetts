# TTS Voice Env Fix Bugfix Design

## Overview

Speech is silent against OpenRouter. `createOpenRouterTts` defaults the voice to `"alloy"`, which the replacement TTS providers reject. `selectTts` never reads a voice from the environment, so configuration cannot fix it. `server.ts` catches speech errors and sends them to `app.log.error`, but `Fastify()` is created without a logger, so the call is a no-op and the failure is invisible.

The fix is small and test-first:

- Add `TTS_VOICE` as a required variable in `selectTts` whenever `OPENROUTER_API_KEY` is set.
- Make `voice` a required field of `OpenRouterTtsConfig` and delete `DEFAULT_VOICE`.
- Add optional `TTS_FORMAT` (`mp3` or `pcm`, default `mp3`) read by `selectTts` and sent as `response_format`. The chosen model, `google/gemini-3.8-flash-tts`, only accepts `pcm` and returns raw 16-bit mono PCM at 24000 Hz.
- Wrap PCM output in a 44-byte WAV header with a new pure module, `apps/server/src/tts/pcmToWav.ts`, and return `audio/wav` so browsers can play it.
- Log speech failures with `console.error`, message only, in `server.ts`.
- Document `TTS_VOICE` and `TTS_FORMAT` in `.env.example` and `.kiro/steering/tech.md`, and expect them in `envExample.test.ts`.
- Update existing tests that set `TTS_MODEL` without `TTS_VOICE`.

Scope is limited to `apps/server`, `.env.example` and `.kiro/steering/tech.md`.

## Glossary

- **Bug_Condition (C)**: `OPENROUTER_API_KEY` and `TTS_MODEL` are non-blank and either `TTS_VOICE` is blank or missing, `TTS_FORMAT` is `pcm`, or `TTS_FORMAT` is invalid. The app then sends a voice the provider rejects, a format the model rejects, or raw PCM the browser cannot play
- **Property (P)**: Startup fails fast with `TTS_VOICE must be set when OPENROUTER_API_KEY is set` or `TTS_FORMAT must be mp3 or pcm`; when set, the trimmed voice and format are sent; PCM comes back as `audio/wav`; speech failures are logged
- **PCM**: Raw 16-bit signed little-endian mono samples at 24000 Hz with no container
- **WAV header**: The 44-byte RIFF/WAVE header placed before PCM bytes so the audio is playable
- **pcmToWav**: Pure function in `apps/server/src/tts/pcmToWav.ts` that returns the header followed by the unchanged PCM bytes
- **TtsFormat**: The type `"mp3" | "pcm"`, exported from `openRouterTts.ts`
- **Preservation**: Stub fallback without a key, the `TTS_MODEL` error, the speech request shape, the error format on non-OK status, and caption delivery on speech failure
- **selectTts**: Function in `apps/server/src/tts/selectTts.ts` that picks the stub or OpenRouter TTS from the environment
- **createOpenRouterTts**: Function in `apps/server/src/tts/openRouterTts.ts` that posts to `/audio/speech`
- **buildServer**: Function in `apps/server/src/server.ts` that wires the speaker, captioner and routes; its speech `.catch` is where failures are swallowed

## Bug Details

### Bug Condition

The bug manifests when the server starts with an OpenRouter key and a TTS model but no voice. `selectTts` does not read `TTS_VOICE`, and `createOpenRouterTts` substitutes `"alloy"`. Every speech request then fails at the provider, and `server.ts` hides the failure because the Fastify logger is disabled.

A second defect: `openRouterTts.ts` hardcodes `RESPONSE_FORMAT = "mp3"`, so a PCM-only model rejects every request. Even with the right format, raw PCM has no container, and the client returns it with whatever content type the provider sent. `selectTts` also never reads `TTS_FORMAT`, so a typo goes unreported.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type TtsRuntime (env, speakResult)
  OUTPUT: boolean

  RETURN nonBlank(input.env.OPENROUTER_API_KEY)
         AND nonBlank(input.env.TTS_MODEL)
         AND ( blank(input.env.TTS_VOICE)
            OR trim(input.env.TTS_FORMAT) = "pcm"
            OR invalidFormat(input.env.TTS_FORMAT) )
END FUNCTION

FUNCTION invalidFormat(value)
  INPUT: value of type string or undefined
  OUTPUT: boolean

  RETURN nonBlank(value) AND trim(value) NOT IN {"mp3", "pcm"}
END FUNCTION
```

**WAV header byte layout** (44 bytes, all integers little-endian, `n` is the PCM byte length):

| Offset | Size | Field | Value |
|---|---|---|---|
| 0 | 4 | ChunkID | ASCII `RIFF` |
| 4 | 4 | ChunkSize | `36 + n` |
| 8 | 4 | Format | ASCII `WAVE` |
| 12 | 4 | Subchunk1ID | ASCII `fmt ` (trailing space) |
| 16 | 4 | Subchunk1Size | `16` |
| 20 | 2 | AudioFormat | `1` (PCM) |
| 22 | 2 | NumChannels | `1` |
| 24 | 4 | SampleRate | `24000` (bytes `C0 5D 00 00`) |
| 28 | 4 | ByteRate | `48000` (bytes `80 BB 00 00`) |
| 32 | 2 | BlockAlign | `2` |
| 34 | 2 | BitsPerSample | `16` |
| 36 | 4 | Subchunk2ID | ASCII `data` |
| 40 | 4 | Subchunk2Size | `n` |
| 44 | n | Payload | the PCM bytes, unchanged |

Byte rate is sample rate times channels times bytes per sample (24000 × 1 × 2). Block align is channels times bytes per sample (1 × 2).

### Examples

- Env `{ OPENROUTER_API_KEY: "sk", TTS_MODEL: "elevenlabs/eleven-v4" }`: expected `selectTts` throws `TTS_VOICE must be set when OPENROUTER_API_KEY is set`; actual returns a client that posts `voice: "alloy"`.
- Env with `TTS_VOICE: "  JBFqnCBsd6RMkjVDRZzb  "`: expected request body `voice` is `"JBFqnCBsd6RMkjVDRZzb"`; actual body has `"alloy"`.
- Env with `TTS_VOICE: "   "`: expected the same startup error as a missing voice.
- Speech endpoint returns 400: expected `console.error` receives `OpenRouter speech failed (400): <message>`; actual nothing is printed.
- Env with `TTS_FORMAT: " pcm "`: expected request body `response_format` is `"pcm"` and the result is `audio/wav` with length `44 + n`; actual body has `"mp3"` and the model rejects it.
- Env with `TTS_FORMAT: "PCM"` or `"wav"`: expected `selectTts` throws `TTS_FORMAT must be mp3 or pcm`; actual returns a client.
- PCM response of bytes `[1, 2, 3, 4]`: expected `pcmToWav` returns 48 bytes, `wav[4..8]` is `28 00 00 00` (40), `wav[40..44]` is `04 00 00 00`, and `wav[44..]` is `[1, 2, 3, 4]`.
- Edge case, empty PCM: expected a 44-byte header with `ChunkSize` 36 and `Subchunk2Size` 0.
- Edge case, no `OPENROUTER_API_KEY`: stub TTS is used and neither voice nor format is required or validated.
- Edge case, blank `TTS_FORMAT`: treated as `mp3`, request and response unchanged.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Without a key, `selectTts` returns the stub TTS and makes no network call
- With a key and no model, `selectTts` throws `TTS_MODEL must be set when OPENROUTER_API_KEY is set`, checked before the voice
- The speech request posts to `/audio/speech` with model, input, voice, format and a bearer header; format is `mp3` when `TTS_FORMAT` is blank, missing or `mp3`
- With `mp3`, response bytes and the response content type (or `audio/mpeg` fallback) are returned unchanged
- With `pcm`, the request carries the same fields as `mp3` and differs only in `response_format`
- Without a key, an invalid `TTS_FORMAT` is ignored
- Non-OK status throws `OpenRouter speech failed (<status>): <message>`
- Successful speech publishes the speech event; captions are announced alongside
- Speech failure still delivers captions and finishes the request
- `.env.example` keeps every other variable in its existing order with empty values

**Scope:**
All inputs where the bug condition does not hold are unaffected. This includes:
- Environments with no or blank `OPENROUTER_API_KEY`
- Environments missing `TTS_MODEL`
- Environments with all three of key, model and voice set and `TTS_FORMAT` blank, missing or `mp3`

## Hypothesized Root Cause

1. **Hardcoded default voice**: `DEFAULT_VOICE = "alloy"` in `openRouterTts.ts` made `voice` optional, so callers never had to supply one.
2. **Missing env wiring**: `selectTts` reads `OPENROUTER_API_KEY` and `TTS_MODEL` only, so there is no configuration path for a voice.
3. **Disabled logger**: `Fastify()` is called with no options, so `app.log.error` discards output. This is the likely reason the failure was never seen.
4. **Undocumented variables**: `.env.example` and `tech.md` never listed a voice or format, and `envExample.test.ts` does not require them.
5. **Hardcoded format**: `RESPONSE_FORMAT = "mp3"` in `openRouterTts.ts` leaves no way to select `pcm`, and `selectTts` reads no `TTS_FORMAT`.
6. **No container for PCM**: the client passes provider bytes through, and no module builds a WAV header, so raw PCM cannot be played by a browser.

## Correctness Properties

Property 1: Bug Condition - Voice Required and Failures Visible

_For any_ input where the bug condition holds (isBugCondition returns true), the fixed `selectTts` SHALL throw `TTS_VOICE must be set when OPENROUTER_API_KEY is set`; _for any_ environment with key, model and non-blank voice, the speech request body SHALL carry `voice` equal to the trimmed `TTS_VOICE`; and _for any_ speech rejection with error E, the server SHALL call `console.error` with the message of E and SHALL NOT print the API key; _for any_ environment with key, model, voice and an invalid `TTS_FORMAT` (anything other than `mp3`, `pcm` or blank after trimming, case-sensitive), `selectTts` SHALL throw `TTS_FORMAT must be mp3 or pcm`; _for any_ valid format, the request `response_format` SHALL equal the trimmed format (`mp3` when blank); and _for any_ PCM bytes P returned under `pcm`, the result SHALL have mime type `audio/wav`, length `44 + length(P)`, the header layout above, and payload P unchanged.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9**

Property 2: Preservation - Existing TTS Behavior

_For any_ input where the bug condition does NOT hold (isBugCondition returns false), the fixed code SHALL produce the same result as the original, preserving the stub fallback, the `TTS_MODEL` error, the request shape, the non-OK error format, and caption delivery when speech fails; and _for any_ environment where `TTS_FORMAT` is blank, missing or `mp3`, the request body SHALL carry `response_format` `mp3` and the returned bytes and mime type SHALL equal the provider response.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9**

## Fix Implementation

### Changes Required

Work in red/green order. Write each failing test, run it and confirm the expected failure, then write the minimum code. No code comments.

**File**: `apps/server/src/tts/openRouterTts.ts`

1. **Require voice**: change `voice?: string` to `voice: string`, remove `DEFAULT_VOICE` and the default in the destructuring.
   - Add `export type TtsFormat = "mp3" | "pcm"` and an optional `format?: TtsFormat` on `OpenRouterTtsConfig`, defaulting to `"mp3"` in the destructuring.
   - Delete the `RESPONSE_FORMAT` constant and send `response_format: format` in the body.
   - After a successful response, read the bytes. When `format` is `"pcm"`, return `{ data: pcmToWav(bytes), mimeType: "audio/wav" }`. Otherwise keep the current return: bytes and `content-type` header, falling back to `audio/mpeg`.
   - Keep the file under 150 lines by keeping the branch in a small helper, `toSpeechAudio(format, bytes, contentType)`, in the same file.

**File**: `apps/server/src/tts/pcmToWav.ts` (new)

2. **Pure WAV wrapper**: export `pcmToWav(pcm: Buffer): Buffer`. Allocate `44 + pcm.length`, write the header with `write` and `writeUInt32LE` / `writeUInt16LE` at the offsets in the layout table, then copy `pcm` at offset 44. Constants for sample rate, channels and bits per sample are named at module top, and byte rate and block align are derived from them. No I/O, no clock, no randomness.

**File**: `apps/server/src/tts/selectTts.ts`

3. **Read and validate voice**: after the model check, read `env.TTS_VOICE?.trim()`; if blank, throw `TTS_VOICE must be set when OPENROUTER_API_KEY is set`.
4. **Read and validate format**: after the voice check, call a small `parseFormat(env.TTS_FORMAT)` in the same file. It trims, returns `"mp3"` for blank or missing, returns the value when it is exactly `"mp3"` or `"pcm"`, and otherwise throws `TTS_FORMAT must be mp3 or pcm`. Comparison is case-sensitive, so `PCM` throws. The check runs after the model and voice checks and only when the key is set.
5. **Pass through**: call `createOpenRouterTts({ apiKey, model, voice, format, fetch: options.fetch })`.

**File**: `apps/server/src/server.ts`

6. **Log failures**: replace `app.log.error(error)` in the speech `.catch` with `console.error` of the message only. Use `error instanceof Error ? error.message : String(error)`, matching the existing pattern in the transcription handler. Never log the error object, since it could carry request details. Console is chosen because the Fastify logger is disabled; enabling it would change log output for every route and is out of scope. Keep the string to a short label plus the message, with the label in `packages/strings` only if the project requires user-facing strings there; operator logs are not user-facing, so an inline label is acceptable.

**File**: `.env.example`

7. **Add variables**: insert `TTS_VOICE=` directly after `TTS_MODEL=`, then `TTS_FORMAT=` directly after `TTS_VOICE=`, both empty.

**File**: `.kiro/steering/tech.md`

8. **Document variables**: in the Variables line, add `TTS_VOICE` and then `TTS_FORMAT` directly after `TTS_MODEL`, keeping every other name in its order.

**File**: `apps/server/src/envExample.test.ts`

9. **Expect variables**: add `"TTS_VOICE"` and then `"TTS_FORMAT"` directly after `"TTS_MODEL"` in the expected list.

**Existing tests to update** (they set `TTS_MODEL` with a key but no voice and would now throw at startup):

10. `apps/server/src/clock/clockWiring.test.ts`: add `TTS_VOICE: "test-voice"` next to `TTS_MODEL: "test/tts"`. Leave `TTS_FORMAT` unset so it defaults to `mp3`.
11. `apps/server/src/settings/withSettings.app.test.ts`: add `TTS_VOICE: "test-voice"` next to `TTS_MODEL: "test/tts"`.
12. `apps/server/src/tts/selectTts.test.ts`: the OpenRouter case `{ OPENROUTER_API_KEY: "sk-test", TTS_MODEL: "vendor/tts" }` gains `TTS_VOICE: "v1"` and asserts `bodies[0]?.voice` is `"v1"` and `response_format` is `"mp3"`. The `TTS_MODEL` refusal test stays unchanged and proves the model check runs first. Add cases for the voice error, blank voice, `TTS_FORMAT` `pcm` (body `response_format` `"pcm"`, result `audio/wav`), blank format, and invalid formats `PCM`, `Mp3`, `wav`.
13. `apps/server/src/tts/openRouterTts.test.ts`: the first test currently expects `voice: "alloy"` with no voice configured. Pass `voice: "v1"` in all three `createOpenRouterTts` calls and expect `voice: "v1"` in the body. Add tests for `format: "pcm"` (body `response_format` `"pcm"`, result `{ data: pcmToWav(bytes), mimeType: "audio/wav" }`, other fields identical to `mp3`) and for the default format sending `mp3`. The `audio/mpeg` fallback and 402 error tests stay as they are apart from the added voice.
14. Re-grep `apps/server/src` for any other env that sets both `OPENROUTER_API_KEY` and `TTS_MODEL` (for example `integration.test.ts`) and add a voice where needed.

## Testing Strategy

### Validation Approach

First surface counterexamples on unfixed code, then verify the fix and preservation. Mock only the fetch boundary. Never call a paid API. Done means `npm test`, `npm run lint` and `npm run typecheck` all pass.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples before implementing. Confirm or refute the root cause.

**Test Plan**: Write the failing tests below and run them on unfixed code. Show the red output before any implementation.

**Test Cases**:
1. **Missing voice**: `selectTts({ OPENROUTER_API_KEY, TTS_MODEL })` throws the voice error (fails on unfixed code, returns a client)
2. **Blank voice**: same with `TTS_VOICE: "   "` (fails on unfixed code)
3. **Voice sent**: with `TTS_VOICE: " v1 "` the recorded body has `voice: "v1"` (fails, body has `"alloy"`)
4. **Failure logged**: with a speaker that rejects, `console.error` is called with the message (fails, nothing logged)
5. **Env example**: `envExample.test.ts` expects `TTS_VOICE` then `TTS_FORMAT` after `TTS_MODEL` (fails, variables absent)
6. **Format sent**: with `format: "pcm"` the recorded body has `response_format: "pcm"` (fails, body has `"mp3"` and the config field does not exist)
7. **Invalid format**: `selectTts` with `TTS_FORMAT: "PCM"` throws (fails, returns a client)
8. **WAV wrapping**: `pcmToWav([1, 2, 3, 4])` has the expected 48 bytes (fails, module absent)

**Expected Counterexamples**:
- `selectTts` returns a client when the voice is absent or the format is invalid
- Request body voice is `"alloy"` and format is `"mp3"` regardless of environment
- PCM bytes come back with no WAV header
- Possible causes: hardcoded default, hardcoded format, unread env variables, disabled Fastify logger, missing container module

### Fix Checking

**Goal**: For all inputs where the bug condition holds, the fixed code behaves as specified.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := selectTts_fixed(input.env)
  ASSERT throws(result, "TTS_VOICE must be set when OPENROUTER_API_KEY is set")
END FOR
```

### Preservation Checking

**Goal**: For all inputs where the bug condition does not hold, the fixed code matches the original.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT selectTts_original(input.env) = selectTts_fixed(input.env)
END FOR
```

**Testing Approach**: Property-based tests suit this because the rule must hold for every environment shape, including whitespace-only values.

**Test Plan**: Observe the stub fallback, model error and request shape on unfixed code, then keep those tests green after the fix.

**Test Cases**:
1. **Stub fallback**: blank or absent key returns stub audio and makes no fetch call, even with an invalid `TTS_FORMAT`
2. **Model error order**: key set, model blank, voice and format anything throws the model error
3. **Request shape**: URL, bearer header, model, input and `mp3` format unchanged
4. **Caption on failure**: captions still announced when speech rejects
5. **mp3 passthrough**: blank, missing or `mp3` format returns provider bytes and content type unchanged, with the `audio/mpeg` fallback
6. **Voice before format**: key and model set, voice blank, format invalid throws the voice error

### Unit Tests

- `selectTts`: missing voice, blank voice, trimmed voice reaches the request body, model error precedes voice error, stub path needs neither
- `createOpenRouterTts`: sends the supplied voice; non-OK error format unchanged; `pcm` sends `response_format` `"pcm"` and returns `audio/wav`; default sends `mp3`
- `selectTts`: blank, `mp3` and `pcm` (with surrounding spaces) accepted; `PCM`, `Mp3`, `wav` throw `TTS_FORMAT must be mp3 or pcm`; format error comes after model and voice errors
- `pcmToWav` in `pcmToWav.test.ts`: empty input gives exactly 44 bytes with `ChunkSize` 36 and `Subchunk2Size` 0; `[1, 2, 3, 4]` gives 48 bytes; ASCII markers `RIFF`, `WAVE`, `fmt `, `data` sit at offsets 0, 8, 12, 36; fields at offsets 16, 20, 22, 24, 28, 32, 34 equal 16, 1, 1, 24000, 48000, 2, 16; payload starts at offset 44; the input buffer is not mutated
- `server.ts` speech catch: `console.error` receives the message only, and the request still returns normally

### Property-Based Tests

- For any non-blank key, model and voice (with arbitrary surrounding whitespace), the request body voice equals the trimmed voice
- For any env with a blank or absent key, `selectTts` returns a working stub regardless of `TTS_MODEL` and `TTS_VOICE`
- For any env with key and non-blank model but blank voice (any whitespace string), `selectTts` throws the voice error
- For any rejection message, the logged output contains that message and does not contain the API key
- `pcmToWav` in `pcmToWav.test.ts`, using `fast-check` if already a dependency (state the reason if it must be added), over arbitrary byte arrays from empty to a few kilobytes:
  - output length equals `44 + input.length`
  - `readUInt32LE(4)` equals `36 + input.length` and `readUInt32LE(40)` equals `input.length`
  - `output.subarray(44)` equals the input
  - the 44-byte header depends only on the input length, so two inputs of equal length share an identical header
  - the fixed fields (markers, `16`, `1`, `1`, `24000`, `48000`, `2`, `16`) hold for every input
- For any env with key, model, voice and a `TTS_FORMAT` that is not blank and not exactly `mp3` or `pcm` after trimming, `selectTts` throws `TTS_FORMAT must be mp3 or pcm`
- For any env with a valid format (with arbitrary surrounding whitespace), the request `response_format` equals the trimmed format, or `mp3` when blank
- For any bytes returned under `mp3`, the result data equals the bytes

### Integration Tests

- Full request with a rejecting TTS: captions are delivered, the response completes, `console.error` is called once with the message
- Full request with a working TTS and voice set: the speech event is published
- Full request with `TTS_FORMAT` `pcm` and a fake fetch returning raw PCM: the stored speech audio starts with `RIFF`, has mime type `audio/wav`, and the speech event is published
- `buildServer` with an invalid `TTS_FORMAT` and a key set fails at startup with `TTS_FORMAT must be mp3 or pcm`
- `clockWiring` and `withSettings.app` tests pass with `TTS_VOICE` added
