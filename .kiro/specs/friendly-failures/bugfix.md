# Bugfix Requirements Document

## Introduction

When something fails, yazd speaks and captions a raw English error that contains internal tool names, for example `send_message failed: No contact matches "mio cugino"`, even when the user spoke Italian. The reference user is an elderly person who must never hear tool names or English error text.

Two causes were confirmed in the code:

- `withContactResolution` returns `ok: false` when no contact matches or several match. `runSubAgent` turns any `ok: false` tool result into a `tool_failed` result and ends the run, so the comms agent never gets a chance to answer in the user's language. `withSettings` and `withClock` already avoid this by returning `ok: true` with `applied: false`.
- `spokenText` (used by both the speaker and the assistant caption in `server.ts`) passes every failed result through `describeFailure`. `describeFailure` is English-only and includes tool names and internal messages.

A third gap affects one of the demo requests: the demo contacts only have the aliases `Mom`, `Dad`, `مامان` and `بابا`, so Italian relationship words do not match.

The fix has four parts: contact resolution reports a miss as `applied: false` data, every sub-agent prompt tells the agent how to handle `applied: false`, failures that no agent can answer get a friendly apology in the language of the request, and the demo contacts gain Italian and English aliases. The event contract (`AssistantEvent`) and `apps/web` do not change.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a contact tool (`call_contact` or `send_message`) is called with a name that matches no contact THEN the system returns `ok: false` with the English error `No contact matches "<name>"`, the sub-agent run ends as `tool_failed`, and the comms agent never replies

1.2 WHEN a contact tool is called with a name that matches several contacts THEN the system returns `ok: false` with the English error `Several contacts match "<name>": <names>`, the sub-agent run ends as `tool_failed`, and the comms agent never asks which contact the user meant

1.3 WHEN a request ends with a failed result THEN the system speaks and captions the output of `describeFailure`, which is English and includes tool names (for example `send_message failed: ...`) or internal messages, regardless of the language the user spoke

1.4 WHEN a sub-agent tool returns `applied: false` THEN the comms, home and media agent prompts give no instruction on how to respond, so the agent may echo the raw `error` text, mention a tool name, or answer in the wrong language

1.5 WHEN the user says a relationship word such as "mamma", "papà", "mom" or "dad" THEN the system finds no match for the Italian words, because the demo contacts only carry the aliases `Mom`, `Dad`, `مامان` and `بابا`

### Expected Behavior (Correct)

2.1 WHEN a contact tool is called with a name that matches no contact THEN the system SHALL return `ok: true` with `applied: false`, a reason that says no contact matched, and up to 3 of the closest contact names, SHALL NOT call the underlying call or message tool, and SHALL let the comms agent reply to the user in the user's language

2.2 WHEN a contact tool is called with a name that matches several contacts THEN the system SHALL return `ok: true` with `applied: false`, a reason that says several contacts matched, and the matching contact names (at most 3), SHALL NOT call the underlying call or message tool, and SHALL let the comms agent ask which contact the user meant in the user's language

2.3 WHEN a request ends as `failed` with reason `llm_error`, `too_many_steps`, `unroutable`, `invalid_tool_call`, or `tool_failed` THEN the system SHALL speak and caption a short friendly apology in the language of the user's request, SHALL NOT include tool names, error text or `describeFailure` output in the spoken or captioned reply, and SHALL keep the original `RequestResult` failure unchanged so `describeFailure` remains available to the activity panel

2.4 WHEN a sub-agent tool returns `applied: false` THEN the comms, home, media, settings and clock agent prompts SHALL instruct the agent to explain briefly in the user's language, to ask one short question if it helps, and never to mention tool names, and the clarifier prompt SHALL keep its single-question behavior and also never mention tool names; every prompt SHALL keep containing "the user's language" and SHALL NOT name any language

2.5 WHEN the user says "mamma", "papà", "mom" or "dad" THEN the system SHALL match the existing mom contact (`فاطمه`) for "mamma" and "mom", and the existing dad contact (`حسین احمدی`) for "papà" and "dad", through the normalizers in `packages/contacts`

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a contact name matches exactly one contact THEN the system SHALL CONTINUE TO call the underlying tool with the stored contact name and return `ok: true` with `contact` set to the stored name

3.2 WHEN the underlying call or message tool itself returns `ok: false` or throws THEN the system SHALL CONTINUE TO pass that result through unchanged from `withContactResolution`

3.3 WHEN a request ends as `succeeded` or `clarification` THEN the system SHALL CONTINUE TO speak and caption the agent reply or the clarification question exactly as before

3.4 WHEN a settings tool or the clock tool returns `applied: false` THEN the system SHALL CONTINUE TO return the same `ok: true` output shape, and the settings and clock agents SHALL CONTINUE TO follow their existing instructions (relative setting changes, `get_time` first, no time or day when unavailable)

3.5 WHEN the web activity panel and typed-request panel render a failed result THEN the system SHALL CONTINUE TO show `describeFailure` text, and the `RequestResult`, `RequestFailure` and `AssistantEvent` types SHALL CONTINUE TO have the same shape

3.6 WHEN the user says an existing alias or contact name (`مامان`, `بابا`, `Mom`, `Dad`, `آقا جون`, full names in Persian, Arabic or Latin script) THEN the system SHALL CONTINUE TO match the same contact as before, with no new ambiguity between existing contacts

3.7 WHEN a failure occurs or a reply is produced THEN the system SHALL CONTINUE TO emit the same `state`, `agent`, `tool_call`, `speech` and `caption` event types in the same order, and the `tool_call` event for a contact miss SHALL CONTINUE TO be a `started` then `succeeded` pair once the miss is returned as data

3.8 WHEN a request is routed to a sub-agent and the route is unchanged THEN the system SHALL CONTINUE TO use the same routing, step limit (`MAX_TOOL_TURNS`) and tool validation

## Bug Condition

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type SpokenOutcome (a tool result or a RequestResult, plus the request text)
  OUTPUT: boolean

  RETURN (X.tool IN {call_contact, send_message} AND X.contactQuery has no unique match
            AND X.toolResult.ok = false)
      OR (X.result.status = "failed" AND (spokenText(X.result) OR caption(X.result)) = describeFailure(X.result.failure))
      OR (X.contactQuery IN {"mamma", "papà"} AND NOT matches(X.contactQuery, expectedContact))
END FUNCTION
```

```pascal
// Property: Fix Checking - Contact miss or ambiguity is data, not failure
FOR ALL X WHERE isBugCondition(X) AND X.tool IN {call_contact, send_message} DO
  result ← withContactResolution'(X.tool).execute(X.input)
  ASSERT result.ok = true AND result.output.applied = false
     AND result.output.reason IS NOT EMPTY
     AND LENGTH(result.output.closest) <= 3
     AND underlying tool was NOT called
END FOR

// Property: Fix Checking - Friendly fallback
FOR ALL X WHERE isBugCondition(X) AND X.result.status = "failed" DO
  reply ← friendlyReply'(X.result, X.requestText)
  ASSERT reply NOT CONTAINS any ToolName
     AND reply NOT CONTAINS describeFailure(X.result.failure)
     AND reply IS in the language of X.requestText
     AND spoken text = caption text
END FOR

// Property: Fix Checking - Aliases
FOR ALL X WHERE X.contactQuery IN {"mamma", "mom"} DO
  ASSERT matchContact'(X.contactQuery).candidates[0].contact.name = "فاطمه" AND NOT ambiguous
END FOR
FOR ALL X WHERE X.contactQuery IN {"papà", "dad"} DO
  ASSERT matchContact'(X.contactQuery).candidates[0].contact.name = "حسین احمدی" AND NOT ambiguous
END FOR
```

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR
```

Counterexample: a user says "manda un messaggio al mio cugino" (Italian). The comms agent calls `send_message` with `mio cugino`, no contact matches, and yazd speaks and captions `send_message failed: No contact matches "mio cugino"`.

## Open Design Decisions

These do not change the requirements above. They must be decided and stated explicitly in `design.md`.

- How the fallback apology in 2.3 is produced in the language of the request, since no agent runs. Candidates are a small direct LLM call with a language-agnostic prompt, a multilingual static table in `packages/strings`, and a neutral non-text signal. The tradeoff to record: an LLM call can match any language but fails exactly when the LLM is the failure (`llm_error`), while a static table works offline but covers only listed languages. The design must also say what happens when the language cannot be determined.
- Where the fallback sits so that spoken text and caption stay identical and `describeFailure` stays unchanged for the activity panel. `spokenText` is currently synchronous and is called separately by the speaker and by `server.ts`, so a language-aware reply may need to be computed once and reused.
- Whether `tool_failed` is covered by the fallback. It is included in 2.3 because a tool that throws would otherwise still speak tool names.
