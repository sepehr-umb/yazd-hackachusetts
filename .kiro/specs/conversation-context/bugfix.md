# Bugfix Requirements Document

## Introduction

The server treats every request as the first one. Two symptoms share this root cause.

First, follow-up answers fail. The user says "call Ahmadi", yazd asks "Hossein Ahmadi or Hassan Ahmadi?", and the user answers "Hossein". The answer reaches the orchestrator alone, without the request or the question it answers, so yazd asks what to do with Hossein instead of calling Hossein Ahmadi. For the reference user, an elderly Farsi speaker who cannot see the screen, a failed follow-up means the call never happens.

Second, yazd guesses the reply language. Gibberish or very short input has no clear language, and nothing tells the server the user's preferred language, so the reply can come back in a random language such as French. The fix always passes the preferred language to the model as a fallback. The model decides what counts as unclear, so no language-specific heuristic is used.

In the Ahmadi flow the question is spoken by the comms sub-agent as an ordinary succeeded reply, not as a clarification result. A fix that only watches for the clarification status would miss the main case, so both ways of asking a question count as a pending question.

The profile's preferred language already exists in the web app (`Profile.language`, default "fa"). The OpenRouter speech-to-text endpoint accepts an optional `language` field in the JSON body that the current client does not send. Support for the field depends on the model configured in `STT_MODEL`.

Bug condition, with F as the current server and F' as the fixed server:

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type Request { text, language?, previous }
  OUTPUT: boolean

  RETURN (X.previous.endedWithQuestion AND X.previous.ageMs <= 90000)
      OR (X.language is present AND modelCannotTellLanguage(X.text))
END FUNCTION
```

```pascal
// Property: Fix Checking - Follow-up
FOR ALL X WHERE X.previous.endedWithQuestion AND X.previous.ageMs <= 90000 DO
  input ← F'(X).orchestratorInput
  ASSERT input contains X.previous.originalRequest
     AND input contains X.previous.question
     AND input contains X.text
END FOR

// Property: Fix Checking - Language
FOR ALL X WHERE X.language is present AND modelCannotTellLanguage(X.text) DO
  prompt ← F'(X).systemPrompt
  ASSERT prompt contains "Reply in the language the user spoke. If you cannot tell which language that is, reply in " + X.language
END FOR
```

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR
```

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a request ends in a clarification result and the user answers within 90 seconds THEN the system passes only the answer to the orchestrator, without the original request or the question, so the orchestrator asks what to do with the answer instead of completing the original request

1.2 WHEN a comms reply asks the user to choose between matching contacts (for example "Hossein Ahmadi or Hassan Ahmadi?") and the user answers "Hossein" THEN the system treats "Hossein" as a new request and does not call Hossein Ahmadi

1.3 WHEN the user's request text has an unclear language (gibberish, no letters, or a very short utterance) THEN the system replies in a language chosen by the model, which can be an unrelated language such as French

1.4 WHEN a request fails and the apology is built from request text with an unclear language THEN the system falls back to English, or lets the model pick a language, ignoring the profile's preferred language

1.5 WHEN the web app submits a typed or voice request THEN the system receives no preferred language, so neither the orchestrator, the apology replier, nor the speech-to-text call can use one

1.6 WHEN a voice recording is sent for transcription THEN the system sends no language hint to the OpenRouter speech-to-text call, so a short or noisy recording can be transcribed in the wrong language

### Expected Behavior (Correct)

2.1 WHEN a request ends in a clarification result or in a reply that asks the user a question, and the next request arrives within 90 seconds THEN the system SHALL pass the original request, the question and the answer to the orchestrator together, so the answer completes the original request

2.2 WHEN the user answers "Hossein" to "Hossein Ahmadi or Hassan Ahmadi?" within 90 seconds of "call Ahmadi" THEN the system SHALL route the combined input so the call goes to Hossein Ahmadi, with no further question about what to do

2.3 WHEN a preferred language is present THEN the system SHALL always add this sentence to the sub-agent system prompt, with the language code as data: "Reply in the language the user spoke. If you cannot tell which language that is, reply in <preferred language>." so that the model replies in the preferred language when it cannot tell which language the user spoke, and the model alone decides what is unclear (for example "xqzv" gets the preferred language)

2.4 WHEN a request fails and a preferred language is present THEN the system SHALL add the same sentence to the model apology prompt, and SHALL build the fixed fallback apology in the preferred language only when the request text contains no letters at all and the preferred language is one of fa, ar, it or en, and otherwise from the detected language of the request text as today

2.5 WHEN the web app submits a typed or voice request THEN the system SHALL carry the profile's preferred language with that request and pass it to the orchestrator and the apology replier

2.6 WHEN a voice recording is sent for transcription and a preferred language is present THEN the system SHALL send it as the `language` field of the OpenRouter speech-to-text call, and SHALL send no `language` field when none is present

2.7 WHEN a pending question is older than 90 seconds, or the previous request ended in anything other than a question THEN the system SHALL clear the pending context and treat the next request as a first request

2.8 WHEN the pending context is read THEN the system SHALL measure its age with an injected clock, so tests control time

2.9 WHEN a follow-up has been combined with its pending context THEN the system SHALL clear that context, and SHALL set a new one only if the combined request again ends in a question

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a request arrives with no pending context THEN the system SHALL CONTINUE TO pass only the request text to the orchestrator

3.2 WHEN a request ends in a successful action, a failure, or a spoken answer that is not a question THEN the system SHALL CONTINUE TO return the same result and keep no pending context

3.3 WHEN the request text has a clear language (Farsi, Arabic, Italian, English or any other recognizable language) THEN the system SHALL CONTINUE TO tell the model to reply in the language the user spoke, with the preferred language only as a fallback

3.4 WHEN no preferred language is sent THEN the system SHALL CONTINUE TO produce prompts, apologies and speech-to-text bodies byte-identical to today's

3.5 WHEN the existing "call Ahmadi" request is replayed on its own THEN the system SHALL CONTINUE TO end with the question naming Hossein Ahmadi and Hassan Ahmadi and SHALL CONTINUE TO make no call

3.6 WHEN a typed request body has only `text`, or an audio request has no language header, THEN the system SHALL CONTINUE TO accept it and return the same response shape

3.7 WHEN the event stream carries events for a request THEN the system SHALL CONTINUE TO emit the same `AssistantEvent` types and fields, because no event changes

3.8 WHEN `OPENROUTER_API_KEY` is unset THEN the system SHALL CONTINUE TO run on stubs and replay fixtures with no network call

3.9 WHEN speech-to-text is called with the stub implementation THEN the system SHALL CONTINUE TO return its fixed transcript
