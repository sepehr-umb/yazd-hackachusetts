# Tasks: ui-companion

Every task: failing test first, red run shown, minimal code, full suite, lint, typecheck.

## Phase 1: companion, tap to talk

- [ ] 1.1 Extract `voice/voiceSession.ts` and `voice/toggleKeys.ts`; voiceSurface uses them, its
  tests unchanged
- [ ] 1.2 `companion/companionParams.ts`, `levelSmoother.ts`, `companionState.ts`,
  `companionAnimator.ts`
- [ ] 1.3 `companion/companionSurface.ts` with status line and frame loop
- [ ] 1.4 `companion/orbRenderer.ts`
- [ ] 1.5 Styles, index.html, registry defaults

## Phase 2: shortcut grid

- [ ] 2.1 `shortcuts/shortcuts.ts` data
- [ ] 2.2 `shortcuts/shortcutsSurface.ts` with icons, registered on

## Phase 3: personalize

- [ ] 3.1 `profile/` store with injected storage
- [ ] 3.2 `characters/` registry: orb (hue, shape) and face
- [ ] 3.3 `personalize/personalizeSurface.ts`
- [ ] 3.4 Shortcut grid reads the profile language

## Phase 4: polish (only if 1–3 green before 3:00 PM)

- [ ] 4.1 Captions slide-in
- [ ] 4.2 Activity panel as a "Details" drawer
- [ ] 4.3 Manifest and icon
- [ ] 4.4 Check 360, 768, 1280px; draft PR with screenshots
