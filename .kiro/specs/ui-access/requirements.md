# Requirements: ui-access

yazd adapts to how well the person can see. Stacked on ui-companion. Design rules:
`.kiro/steering/ui-design.md` (Phone rules, Vision levels and the flip).

## Platform

The shipped form is an Android app: the deployed HTTPS site wrapped as a Trusted Web Activity with
PWABuilder or Bubblewrap, outside this repo. Nothing native enters the repo: no Capacitor, no
Cordova, no `android/` folder, no new dependency. The web app works in Chrome on Android first and in
Safari on iPhone second. Portrait targets: 360×800 and 412×915 (Android), 390×844 and 430×932
(iPhone).

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

1. `navigator.vibrate` is the primary path and SHALL work in Chrome on Android: `haptic("start")`
   vibrates 60 ms, `haptic("stop")` two 40 ms pulses. Without it, where the `switch` checkbox exists
   (iOS Safari 17.4+), a hidden switch is toggled through its label: one toggle for start, two for
   stop. The iOS fallback is best effort and stays as built; no further work goes into it. iOS only
   plays the system haptic while the page still has user activation, so a haptic fired after the
   microphone prompt may stay silent. Without either, nothing happens.
2. The voice session fires the start haptic with the start chime and the stop haptic with the stop
   chime, so every surface that records gets both.
3. `flipState` gives `{ color, ink, flash }`: listening color while recording, idle color otherwise;
   one 120 ms white flash per change, at most three flashes in any second, none with reduced motion.

## R3 Full-screen surface (vision minimal)

1. One button filling the screen with flip colors, and a giant status word (≥ 72px bold) in a
   `role="status"` region: idle, listening, thinking, done, or try again, in the profile language.
2. Tap toggles the voice session. Holding 2 s opens setup and starts no recording.
3. The button cancels `contextmenu`, so a long press on Android shows no selection menu.
4. While the reply plays, the idle color brightens with the speech level up to dark grey only.

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
6. Every setup button cancels `contextmenu` and is not text-selectable, so a long press on Android
   shows no selection menu.
7. WHEN the setup sheet opens, THEN it pushes one history entry. WHEN the Android back gesture (or
   the browser back button) fires `popstate` while the sheet is open, THEN the sheet closes and the
   app stays. WHEN the sheet closes any other way (a choice, Escape), THEN it pops its own entry, so
   history never fills with stale entries. While vision is unset, back closes nothing: the sheet
   re-pushes its entry, because setup must finish first.

## R6 Spanish and Italian

Every shortcut has `es` and `it` text as written in the brief. The personalize and setup language
lists come from one `languages` list.

## R7 Polish

Reduced motion: instant color change, no white frame. Hint at low. Screenshots at 390×844, and at
360×800 and 412×915 for the Android sizes.

## R8 App readiness (Phase 3b)

Files: `apps/web/public/**`, `apps/web/index.html`, `apps/web/src/main.ts`, `packages/strings`
(additive). Nothing else in the app changes.

1. `manifest.webmanifest`: name and short_name "yazd", start_url and scope "/", display
   "standalone", orientation "portrait", background_color and theme_color "#000000", icons at
   192×192 and 512×512 with purpose "any", and a separate 512×512 with purpose "maskable" whose
   artwork stays inside the central 80% safe zone. All icons are drawn in this repo; no brand marks.
2. A service worker at `/sw.js` (scope "/"), registered from `main.ts`. Registration failures and a
   missing `navigator.serviceWorker` are ignored.
   1. It caches none of the app's files.
   2. WHEN a navigation request fails, THEN it answers with the cached offline page: black
      background, yellow text, one line saying the assistant needs a connection.
   3. Every other request passes straight through to the network, so a deploy is never stale.
   4. The offline page is the static `public/offline.html`, showing all four lines from
      `strings.offline` (fa, en, es, it), each with its own `lang` and `dir`. A test keeps the page
      and the strings identical. Nothing is posted to the worker, so the page never goes stale.
3. `public/.well-known/assetlinks.json` declares `delegate_permission/common.handle_all_urls` for
   the Android package `app.yazd.companion`, with `sha256_cert_fingerprints`
   `["TO-BE-FILLED-AT-PACKAGING"]`. `npm run build -w @mahmood/web` puts it at
   `dist/.well-known/assetlinks.json`.
4. The page's `theme-color` meta follows the vision level: the page background (`--bg`) at full,
   black at low and minimal and while setup has not run. The manifest's theme_color stays black.
   This one change lives in `apps/web/src/profile/applyProfile.ts`.
5. Acceptance: Chrome DevTools → Application → Manifest shows no installability errors, and Chrome
   on Android offers "Install app". Nothing else in the app changes. npm test, lint and typecheck
   pass.

### Decisions for R8

- Lighthouse removed its PWA category in version 12, so the DevTools Manifest panel and the Android
  install prompt replace a Lighthouse audit.
- New tests live in `apps/web/src/app/`. `apps/web/src/styles/manifest.test.ts` is edited because
  the requirement changed: the manifest is now black on purpose, not the page's `--bg`.
- Serving `/.well-known/` as `application/json` is deploy config, outside this repo.
