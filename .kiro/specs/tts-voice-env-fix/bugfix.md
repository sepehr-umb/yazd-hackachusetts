# Bugfix Requirements Document

## Introduction

Text-to-speech is silent when yazd runs against OpenRouter. The OpenAI TTS model was retired from OpenRouter, and the replacement providers require an explicit voice. `createOpenRouterTts` falls back to a hardcoded voice `"alloy"`, which the new providers reject. `selectTts` never reads a voice from the environment, so the operator cannot fix it through configuration. The failure stays hidden because `server.ts` swallows speech errors. For the reference user, who relies on audio feedback, a silent assistant means no confirmation of any action.

The chosen model, `google/gemini-3.8-flash-tts`, adds a second defect. It only accepts `response_format` `"pcm"` and returns raw 16-bit mono PCM at 24000 Hz, but the client hardcodes `response_format` `"mp3"`, so the model rejects every request. Browsers cannot play raw PCM, so the bytes must also be wrapped in a WAV container before they reach playback.

Decision on `TTS_FORMAT` parsing: the value is trimmed and compared case-sensitively against the lowercase strings `mp3` and `pcm`. A blank or missing value means `mp3`. Any other value, including `PCM` or `Mp3`, is rejected at startup when the key is set.

The bug condition, where `X` is the server startup environment plus a speech request:

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type TtsRuntime (env, speakResult)
  OUTPUT: boolean

  RETURN nonBlank(X.env.OPENROUTER_API_KEY)
     AND nonBlank(X.env.TTS_MODEL)
     AND ( blank(X.env.TTS_VOICE)
        OR trim(X.env.TTS_FORMAT) = "pcm"
        OR invalidFormat(X.env.TTS_FORMAT) )
END FUNCTION

FUNCTION invalidFormat(V)
  INPUT: V of type string or undefined
  OUTPUT: boolean

  RETURN nonBlank(V) AND trim(V) NOT IN {"mp3", "pcm"}
END FUNCTION
```

```pascal
// Property: Fix Checking - Voice Required and Failures Visible
FOR ALL X WHERE isBugCondition(X) AND blank(X.env.TTS_VOICE) DO
  result ← selectTts'(X.env)
  ASSERT throws(result, "TTS_VOICE must be set when OPENROUTER_API_KEY is set")
END FOR

FOR ALL X WHERE nonBlank(X.env.OPENROUTER_API_KEY) AND nonBlank(X.env.TTS_MODEL) AND nonBlank(X.env.TTS_VOICE) DO
  ASSERT speechRequestBody'(X).voice = trim(X.env.TTS_VOICE)
END FOR

FOR ALL X WHERE speakResult rejects with error E DO
  ASSERT console.error called with message of E AND no secret printed
END FOR
```

```pascal
// Property: Fix Checking - Configurable Response Format
FOR ALL X WHERE nonBlank(X.env.OPENROUTER_API_KEY) AND nonBlank(X.env.TTS_MODEL) AND nonBlank(X.env.TTS_VOICE)
            AND invalidFormat(X.env.TTS_FORMAT) DO
  result ← selectTts'(X.env)
  ASSERT throws(result, "TTS_FORMAT must be mp3 or pcm")
END FOR

FOR ALL X WHERE nonBlank(X.env.OPENROUTER_API_KEY) AND nonBlank(X.env.TTS_MODEL) AND nonBlank(X.env.TTS_VOICE)
            AND trim(X.env.TTS_FORMAT) = "pcm" DO
  ASSERT speechRequestBody'(X).response_format = "pcm"
  ASSERT result.mimeType = "audio/wav"
  ASSERT length(result.data) = 44 + length(pcmBytes)
  ASSERT result.data[0..44] = wavHeader(24000 Hz, mono, 16-bit, length(pcmBytes))
  ASSERT result.data[44..] = pcmBytes
END FOR

FOR ALL P of type bytes DO
  wav ← pcmToWav(P)
  ASSERT length(wav) = 44 + length(P)
  ASSERT wav[4..8] = littleEndian32(36 + length(P)) AND wav[40..44] = littleEndian32(length(P))
  ASSERT wav[44..] = P
END FOR
```

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR

FOR ALL X WHERE blank(X.env.TTS_FORMAT) OR trim(X.env.TTS_FORMAT) = "mp3" DO
  ASSERT speechRequestBody'(X).response_format = "mp3"
  ASSERT result'.mimeType = result.mimeType AND result'.data = result.data
END FOR
```

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `OPENROUTER_API_KEY` and `TTS_MODEL` are set and `TTS_VOICE` is missing or blank THEN the system starts without error and sends the hardcoded voice `"alloy"` in every speech request, which the replacement providers reject
1.2 WHEN `OPENROUTER_API_KEY`, `TTS_MODEL` and a voice value are set in the environment THEN the system ignores the voice because `selectTts` does not read `TTS_VOICE` and still sends `"alloy"`
1.3 WHEN `createOpenRouterTts` is called without a `voice` THEN the system substitutes the default `"alloy"` instead of requiring a voice
1.4 WHEN a speech synthesis request fails THEN the system hides the error because `server.ts` swallows it, so the user hears nothing and the operator sees no message in the console
1.5 WHEN `.env.example` and the variable list in `.kiro/steering/tech.md` are consulted THEN the system documents no `TTS_VOICE` and no `TTS_FORMAT` variable, so operators do not know they exist
1.6 WHEN the configured TTS model only accepts `pcm`, such as `google/gemini-3.8-flash-tts`, THEN the system still sends `response_format` `"mp3"` because the format is hardcoded, and the model rejects every speech request
1.7 WHEN the speech endpoint returns raw 16-bit mono PCM at 24000 Hz THEN the system returns the bytes unchanged with a mime type that does not describe them, so the browser cannot play them
1.8 WHEN `TTS_FORMAT` is set to a value other than `mp3` or `pcm` THEN the system ignores it because `selectTts` does not read `TTS_FORMAT`, so a misconfiguration goes unreported

### Expected Behavior (Correct)

2.1 WHEN `OPENROUTER_API_KEY` and `TTS_MODEL` are set and `TTS_VOICE` is missing or blank THEN the system SHALL throw the error `TTS_VOICE must be set when OPENROUTER_API_KEY is set` at startup, in the same way it does for a missing `TTS_MODEL`
2.2 WHEN `OPENROUTER_API_KEY`, `TTS_MODEL` and `TTS_VOICE` are set THEN the system SHALL read `TTS_VOICE` (trimmed) in `selectTts`, pass it to `createOpenRouterTts`, and send it as the `voice` field of the speech request
2.3 WHEN `createOpenRouterTts` is configured THEN the system SHALL require an explicit `voice` and SHALL NOT fall back to any hardcoded default voice
2.4 WHEN a speech synthesis request fails THEN the system SHALL log the error message to the console, SHALL log only the message and never the API key or other secrets, and SHALL still complete the request without crashing
2.5 WHEN `.env.example` and the variable list in `.kiro/steering/tech.md` are consulted THEN the system SHALL list `TTS_VOICE` directly after `TTS_MODEL` and `TTS_FORMAT` directly after `TTS_VOICE`, with empty values in `.env.example`, and `envExample.test.ts` SHALL expect both
2.6 WHEN `OPENROUTER_API_KEY`, `TTS_MODEL` and `TTS_VOICE` are set THEN the system SHALL read `TTS_FORMAT` (trimmed, case-sensitive, `mp3` or `pcm`, blank or missing meaning `mp3`) in `selectTts`, pass it to `createOpenRouterTts`, and send it as the `response_format` field of the speech request
2.7 WHEN the configured format is `pcm` THEN the system SHALL wrap the returned bytes in a standard 44-byte WAV header (RIFF/WAVE, PCM format code 1, 1 channel, 24000 Hz sample rate, byte rate 48000, block align 2, 16 bits per sample, correct `data` chunk size and RIFF chunk size of 36 plus the PCM length) followed unchanged by the PCM bytes, and SHALL return the mime type `audio/wav`
2.8 WHEN `OPENROUTER_API_KEY` is set and `TTS_FORMAT` is set to a value other than `mp3` or `pcm` after trimming, including different letter case such as `PCM` THEN the system SHALL throw the error `TTS_FORMAT must be mp3 or pcm` at startup
2.9 WHEN the WAV header logic is implemented THEN the system SHALL keep it in its own pure module, `apps/server/src/tts/pcmToWav.ts`, covered by unit tests and property-based tests that check the result is 44 bytes longer than the input, the header sizes match for any PCM length, and the payload is preserved after the header

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `OPENROUTER_API_KEY` is missing, empty or blank THEN the system SHALL CONTINUE TO run on the stub TTS, make no network call, and not require `TTS_MODEL`, `TTS_VOICE` or a valid `TTS_FORMAT`
3.2 WHEN `OPENROUTER_API_KEY` is set and `TTS_MODEL` is missing or blank THEN the system SHALL CONTINUE TO throw `TTS_MODEL must be set when OPENROUTER_API_KEY is set`
3.3 WHEN `OPENROUTER_API_KEY`, `TTS_MODEL` and `TTS_VOICE` are all set THEN the system SHALL CONTINUE TO post to `/audio/speech` with the configured model, the input text, the configured response format (`mp3` by default) and a bearer authorization header, and return the audio data and its mime type
3.4 WHEN the speech endpoint returns a non-OK status THEN the system SHALL CONTINUE TO throw an error of the form `OpenRouter speech failed (<status>): <message>`
3.5 WHEN speech succeeds THEN the system SHALL CONTINUE TO publish the speech event and play the audio, and captions SHALL CONTINUE TO be announced alongside speech
3.6 WHEN speech fails THEN the system SHALL CONTINUE TO deliver captions and finish the request normally rather than failing the whole request
3.7 WHEN `.env.example` is read THEN the system SHALL CONTINUE TO list every other documented variable in its existing order, each with an empty value
3.8 WHEN `TTS_FORMAT` is missing, blank or `mp3` THEN the system SHALL CONTINUE TO return the response bytes unchanged with the mime type `audio/mpeg`, and the request body SHALL CONTINUE TO have the same shape as before, with `response_format` `mp3`
3.9 WHEN `TTS_FORMAT` is `pcm` THEN the system SHALL CONTINUE TO send the same request fields (model, input, voice, bearer authorization header) as for `mp3`, differing only in `response_format`
