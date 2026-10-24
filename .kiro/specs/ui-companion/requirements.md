# Requirements: ui-companion

Rebuild yazd's screen around a tap-to-talk companion and big shortcut buttons, for an elderly,
low-vision, limited-dexterity user. Voice stays the main interface. Design system:
`.kiro/steering/ui-design.md`.

## Constraints

- Every piece of UI is a Surface in `apps/web/src/surfaces/registry.ts`, reading only the
  AssistantEvent stream and the SurfaceContext. No new endpoints. `packages/contracts` untouched.
- `apps/web/src/face/**` is read-only. The face, voice and activity surfaces stay registered, off by
  default.
- User-facing strings are additive keys in `packages/strings/src/strings.ts`. Shortcut labels and
  phrases are data.
- No new dependencies, no package.json or lockfile edits. Files under 150 lines, no comments.

## R1 Companion, tap to talk

1. WHEN the user taps the companion, presses Space or Enter, THEN a start chime plays and recording
   begins; the companion shows an expanding ring and its scale follows the mic level.
2. WHEN the user stops talking (silence timeout) or taps again, THEN a stop chime plays, the
   recording is sent and the status line says "Thinking".
3. WHEN no speech arrives before the no-speech timeout, THEN recording stops without sending and the
   status line says "Nothing was heard".
4. WHEN the reply plays, THEN the companion scale follows the speech level with fast attack and slow
   release.
5. WHILE idle, the companion breathes at 0.25 Hz, scale 1 ± 0.03.
6. WHEN an error state arrives, THEN the companion tints toward the error color and settles back
   within 1 s; the status line carries the failure text.
7. The voice surface keeps its behavior and its tests unchanged after the phase machine is
   extracted into `voice/voiceSession.ts`.
8. Defaults: companion, captions, textInput on; face, voice, activityPanel off. Page title "yazd".

## R2 Shortcut grid

1. Shortcuts are data: id, kind (call, light, tv), and per-language label and phrase.
2. Each shortcut is a button with an icon for its kind, the display-language label and the other
   language's label as sublabel.
3. WHEN a shortcut is pressed, THEN its phrase is submitted exactly as written and the grid is
   disabled until the result returns.
4. 2 columns at 360px, 3 from 900px; keyboard reachable.

## R3 Personalize

1. Profile: name, hue, shape (circle, blob, ring), character (orb, face), language. Defaults
   "yazd", hue of `--accent`, circle, orb, fa. Persisted through an injected storage that never
   throws; changes apply live.
2. Characters registry: orb (reads hue and shape) and face (the WebGL face lip-synced from the same
   speech frames). The companion mounts the profile's character.
3. A round personalize button bottom-end opens a sheet: name, six warm hues, shape, character,
   language (every language in the shortcut data). Escape or tapping outside closes it.
4. The shortcut grid reads the profile language.

## R4 Polish (time permitting)

Captions restyled with a soft slide-in; activity panel as a collapsible "Details" drawer; web
manifest and icon; checked at 360, 768 and 1280px.
