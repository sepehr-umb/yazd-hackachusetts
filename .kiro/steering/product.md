---
inclusion: always
---

# Product: yazd

yazd is a voice-first assistant that adapts to the person using it. The user speaks a request in their own language. An orchestrator agent routes it to a sub-agent that acts: call or message a contact, control smart home devices, control the TV, or change how yazd itself behaves.

## Who it is for

- Older adults who cannot use a smartphone comfortably
- People with low vision, limited dexterity, or hearing loss
- People who do not speak English

The reference user is an elderly Farsi speaker with near-total vision loss and limited dexterity. Every design decision is checked against him first.

## Core principles

- **Voice is the main interface.** Audio feedback carries every result. The screen is secondary, for sighted helpers, captions, and demos.
- **Any language.** yazd understands and replies in the language the user speaks. No prompt, string, or rule assumes English or Farsi.
- **Adapts to the person.** Speech rate, caption size, contrast, silence timing, and confirmation behavior are settings, not constants. The user changes them by voice.
- **Confirm out loud.** Every action ends with a short spoken confirmation. Ambiguity gets one short question, never a guess.
- **Forgiving input.** Contact names match across scripts, spellings, nicknames, and relationships ("mom", "مامان").
- **Always recoverable.** "Go back to normal" resets settings from any state.
- **Safe by default.** No real calls or messages from tests or demos. Every side effect sits behind a stubbed tool.

## Extensibility

yazd is open source and built as a framework. Every ability is a self-contained extension: an agent, its tools, and an optional surface. Developers and caregivers clone the repo and add the ability their person needs. The app itself does not let end users author features.

When choosing between designs:
- Prefer registries and data over hardcoded lists.
- Every surface (face, captions, activity panel, text input, voice) is independent and can be turned off.
- The AssistantEvent stream is the public seam. Surfaces consume it and never reach into the server.
- Features read from user settings, not from constants.

## Hackathon context

Built for Hackachusetts 2026, Healthcare & Biotech track: access to care and aging in place. The project existed before the event. Work done during the event is built with Kiro and disclosed as such.

Demo priorities, in order:
1. A spoken request in Farsi produces a visible, spoken result, with English captions.
2. The user customizes yazd by voice and the change is visible immediately.
3. A new ability is added through the extension framework.

## Out of scope

- Native Android shell, real calling, real messaging
- User accounts, cross-device sync
- In-app feature authoring
- Viseme lip sync