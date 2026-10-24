# Design: ui-companion

## Companion state

The server emits `thinking`, then `speaking` or `error`, then `idle`. It never emits `listening`,
because it does not know a recording has started. The companion therefore combines its local voice
phase with the stream:

| Voice phase | Shown state |
|---|---|
| `starting`, `recording` | `listening` |
| `sending` | `thinking` |
| `idle` | latest `state` event from the stream |

## Modules

```
voice/voiceSession.ts         phase machine: idle → starting → recording → sending → idle
voice/toggleKeys.ts           page-wide Space/Enter toggle, shared by voice and companion
companion/companionState.ts   pure: voice phase + stream state → shown state
companion/companionParams.ts  pure: state, levels, time → { scale, ring, glow, spin, tint }
companion/levelSmoother.ts    fast attack, slow release
companion/companionAnimator.ts tracks state entry time, smooths levels, calls companionParams
companion/companionLoop.ts    injected requestFrame/cancelFrame loop
companion/orbRenderer.ts      writes --scale --ring --glow --spin --tint on the orb element
companion/companionSurface.ts the button, the status line, the voice session
shortcuts/shortcuts.ts        data
shortcuts/shortcutIcons.ts    inline SVG per kind
shortcuts/shortcutsSurface.ts the grid
profile/                      profile type, defaults, storage, store with subscribe()
characters/                   registry of { id, label, mount }: orb and face
personalize/                  the round button and the sheet
styles/                       tokens and per-surface CSS, linked from index.html
```

## Params

- Idle: `scale = 1 + 0.03 sin(2π · 0.25 · t)`, ring 0, spin 0, glow 0.35.
- Listening: `ring = (t mod 1.5) / 1.5`, `scale = 1 + min(0.15, 0.6 · mic)`.
- Thinking: `spin = (t · 0.1) mod 1` turns, scale 1.
- Speaking: `scale = 1 + 0.25 · speech`, speech from `mouthFromSpectrum(...).open` through the
  smoother.
- Error: `tint = max(0, 1 − stateTime / 0.8)`, so it has settled before 1 s.

## Character contract (phase 3)

```ts
type CharacterEnv = {
  events; speech; profile; shownState(): AssistantState; micLevel(): number;
  requestFrame; cancelFrame;
};
type Character = { id: string; label: string; mount(host: HTMLElement, env: CharacterEnv): Unmount };
```

The orb runs the companion loop and renderer. The face wraps `createFaceAnimator` so each frame it
first applies the shown state, then hands it to `startFaceLoop` with `createFaceRenderer` on a
canvas inside the companion button.

## Profile

`profile` is added to `SurfaceContext` and created in `main.ts` over `localStorage`, behind a
`ProfileStorage` interface with every call in try/catch. Tests use a Map.

## Styles

CSS lives in `apps/web/src/styles/*.css`, linked from `index.html` so TypeScript never imports CSS.
