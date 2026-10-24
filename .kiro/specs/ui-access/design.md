# Design: ui-access

## Modules

```
profile/languages.ts        languages list (fa, en, es, it), dir per language
profile/profile.ts          vision, flip colors, language restricted to the list
profile/applyProfile.ts     lang, dir, data-vision, --flip-* on documentElement
surfaces/settingsFor.ts     pure: profile → which surfaces mount
surfaces/mountForProfile.ts remounts when settingsFor or vision changes
haptics/haptics.ts          vibrate, iOS switch fallback, or nothing
flip/color.ts               luminance, ink, breath mix
flip/flipState.ts           pure flip reducer with flash limit
flip/startFlip.ts           frame loop that writes --flip-color, --flip-ink, data-flash
input/longPress.ts          tap vs 2 s hold on pointer events
fullscreen/accessState.ts   voice phase + stream state → status word key
fullscreen/fullscreenSurface.ts
companion/lowVision.ts      flip and hint on the companion at low
setup/setupControl.ts       open() / onOpen() shared through the context
setup/narrator.ts           speechSynthesis wrapper
setup/setupSurface.ts       the two-step sheet
```

## Context additions

`haptic`, `narrator` (`say(text, language)`, `stop()`) and `setup` (`open()`, `onOpen()`) join
`SurfaceContext`. `testContext` records haptics and narration and uses a real setup control.

## Flip

`flipState(memory, phase, nowMs, palette, reducedMotion)` returns the next memory and
`{ color, ink, flash }`. The target is `palette.listening` when the phase is `recording`, else
`palette.idle`. A target change starts a flash unless three flashes started in the last 1000 ms or
motion is reduced. During a flash the color is `#FFFFFF`. Breath while speaking mixes the idle color
toward `#3A3A3A` by the smoothed speech level.

## Status word

`recording` → listening, `sending` → thinking, `starting` → idle; otherwise the stream:
thinking → thinking, speaking → done, error or a failed notice → error, else idle.

## Keys

Space and Enter toggles ignore anything inside `[role="dialog"]`, so the setup and personalize
sheets never start a recording.
