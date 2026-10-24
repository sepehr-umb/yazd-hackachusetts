# Requirements: ui-access

yazd adapts to how well the person can see. Stacked on ui-companion. Design rules:
`.kiro/steering/ui-design.md` (iPhone, Vision levels and the flip).

## Constraints

Only `apps/web/src/**` (not `face/**`), `apps/web/index.html`, `apps/web/public/**`,
`packages/strings/src/strings.ts` (additive), `.kiro/specs/ui-access/**`, `.kiro/steering/ui-design.md`.
No dependencies. Browser APIs (Vibration, speechSynthesis, pointer events, matchMedia) sit behind
small interfaces; missing APIs degrade silently. The profile is the single source of truth.

## R1 Profile and layout

1. The profile gains `vision` (`full` | `low` | `minimal`, unset until setup runs), language choices
   `fa`, `en`, `es`, `it`, and `flipIdle` `#000000`, `flipListening` `#FFE600`. All persist.
2. `settingsFor(profile)`: unset → setup only; full → today's layout; low → shortcuts, companion,
   captions, text box, personalize; minimal → the full-screen surface only. Setup is mounted at every
   level so it can be reopened.
3. WHEN the layout or vision level changes, THEN surfaces unmount and remount.
4. `document.documentElement` carries the profile's `lang`, `dir`, `data-vision` and flip colors.

## R2 Haptics and the flip

1. `haptic("start")` vibrates 60 ms, `haptic("stop")` two 40 ms pulses, via `navigator.vibrate`.
   Without it, where the `switch` checkbox exists (iOS Safari 17.4+), a hidden switch is toggled
   through its label: one toggle for start, two for stop. This is best effort: iOS only plays the
   system haptic while the page still has user activation, so a haptic fired after the microphone
   prompt may stay silent. Without either, nothing happens.
2. The voice session fires the start haptic with the start chime and the stop haptic with the stop
   chime, so every surface that records gets both.
3. `flipState` gives `{ color, ink, flash }`: listening color while recording, idle color otherwise;
   one 120 ms white flash per change, at most three flashes in any second, none with reduced motion.

## R3 Full-screen surface (vision minimal)

1. One button filling the screen with flip colors, and a giant status word (≥ 72px bold) in a
   `role="status"` region: idle, listening, thinking, done, or try again, in the profile language.
2. Tap toggles the voice session. Holding 2 s opens setup and starts no recording.
3. While the reply plays, the idle color brightens with the speech level up to dark grey only.

## R4 Companion at low and full

At low, the companion body follows the flip instead of the ring, holding it 2 s opens setup, and a
one-line hint says so. At full nothing changes beyond haptics.

## R5 First-launch setup

1. WHEN vision is unset, THEN a black sheet with yellow buttons asks the language: فارسی, English,
   Español, Italiano, each ≥ 96px tall. Step 2 asks vision in the chosen language with three options.
2. Choosing a vision writes language and vision and closes the sheet; the screen reshapes at once.
3. Spoken guidance through an injected narrator over `speechSynthesis`: the question and options
   when step 2 opens, an option on focus, a confirmation on choice. No voice → silent.
4. The personalize sheet and the long press reopen setup.
5. Copy lives in `strings.setup[language]` and `strings.flip[language]`; a test checks every key in
   every language.

## R6 Spanish and Italian

Every shortcut has `es` and `it` text as written in the brief. The personalize and setup language
lists come from one `languages` list.

## R7 Polish

Reduced motion: instant color change, no white frame. Hint at low. Screenshots at 390×844.
