# Tasks: ui-companion

Every task: failing test first, red run shown, minimal code, full suite, lint, typecheck.

## Phase 1: companion, tap to talk

- [x] 1.1 Extract `voice/voiceSession.ts` and `voice/toggleKeys.ts`; voiceSurface uses them, its
  tests unchanged
- [x] 1.2 `companion/companionParams.ts`, `levelSmoother.ts`, `companionState.ts`,
  `companionAnimator.ts`
- [x] 1.3 `companion/companionSurface.ts` with status line and frame loop
- [x] 1.4 `companion/orbRenderer.ts`
- [x] 1.5 Styles, index.html, registry defaults

## Phase 2: shortcut grid

- [x] 2.1 `shortcuts/shortcuts.ts` data
- [x] 2.2 `shortcuts/shortcutsSurface.ts` with icons, registered on

## Phase 3: personalize

- [x] 3.1 `profile/` store with injected storage
- [x] 3.2 `characters/` registry: orb (hue, shape) and face
- [x] 3.3 `personalize/personalizeSurface.ts`
- [x] 3.4 Shortcut grid reads the profile language

## Phase 4: polish (only if 1–3 green before 3:00 PM)

- [x] 4.1 Captions slide-in
- [x] 4.2 Activity panel as a "Details" drawer
- [x] 4.3 Manifest and icon
- [x] 4.4 Check 360, 768, 1280px; draft PR with screenshots
