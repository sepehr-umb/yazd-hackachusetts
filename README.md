# yazd

A voice-first assistant for people who cannot use a smartphone. Say what you want, in your own language. yazd does it and tells you out loud.

Built for my grandfather. He is nearly blind and speaks Farsi. He wants to call his family without help.

- **Live demo:** https://yazd-hackachusetts.onrender.com
- **Landing page:** https://yazd-hackachusetts-landing.vercel.app/
- **Demo video:** VIDEO_LINK
- **How we used Kiro:** [docs/kiro-writeup.md](docs/kiro-writeup.md)

Hackachusetts 2026, Healthcare & Biotech track.

## What it does

- **Calls and messages.** "Call mom" in Farsi, English, Italian or Spanish. Contact names match across scripts, spellings and nicknames.
- **Asks when unsure.** "Call Ahmadi" gets one short question: which one? The next answer counts.
- **Smart home and TV.** Lights on, off and dimmed. Play and pause.
- **Changes itself by voice.** "Make the text bigger." "Speak slower." "Go back to normal."
- **Replies in your language.** Every reply is spoken, with English captions for helpers.
- **Shortcut tiles.** Large tiles for the most common requests, labeled in the user's language.

In this build, calls, messages, lights and TV run through stub tools: yazd understands the request, picks the action and confirms it out loud, but places no real call and controls no real device. Real integrations plug in behind the same tool interface.

## Run it

```bash
npm install
cp .env.example .env
npm run dev
```

Open the URL Vite prints. With no API key, yazd replays recorded conversations, so only the demo phrases work. The shortcut tiles use them.

For live speech, add an [OpenRouter](https://openrouter.ai) key and models to `.env`:

```
OPENROUTER_API_KEY=
LLM_MODEL=
STT_MODEL=
TTS_MODEL=
TTS_VOICE=
TTS_FORMAT=
```

Never commit `.env`.

```bash
npm test
npm run lint
npm run typecheck
```

## How it works

```
mic → speech-to-text → orchestrator → sub-agent → tool → result
                             ↓
              event stream (WebSocket) → surfaces
                             ↓
                    spoken reply → playback
```

- An **orchestrator** routes each request to a sub-agent: comms, home, media, settings, clock, or a clarifier.
- Sub-agents act only through **tools**. Every tool has a stub, so tests and demos never place real calls.
- The server emits an **AssistantEvent** stream. Each screen element (companion, captions, shortcuts, activity) is an independent surface that reads it.

TypeScript monorepo: Fastify server in `apps/server`, Vite web app in `apps/web`, shared contracts, contacts and strings in `packages/`.

## Add an ability

yazd is a framework. Each ability is an extension: an agent, its tools and an optional surface. Caregivers and developers clone the repo and add what their person needs.

The recipe is in [.kiro/steering/extensions.md](.kiro/steering/extensions.md). In Kiro, start a prompt with `#extensions` to load it. The clock ability was built from one such prompt.

## License

[MIT](LICENSE)
