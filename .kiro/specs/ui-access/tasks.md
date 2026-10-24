# Tasks: ui-access

Every task: failing test first, red run shown, minimal code, full suite, lint, typecheck.

## Phase 1: haptics and the flip

- [x] 1.1 Profile: vision, languages, flip colors; applyProfile on the document
- [x] 1.2 settingsFor and mountForProfile; main.ts wiring
- [x] 1.3 Haptics module; the voice session fires haptics with chimes. `navigator.vibrate` is already
  the first path, which covers Chrome on Android (R2.1); the iOS switch fallback gets no more tasks
- [x] 1.4 flipState and color helpers
- [x] 1.5 Long press, setup control, full-screen surface, styles, viewport. `onPressOrHold` already
  cancels `contextmenu` on the full-screen button, with a test (R3.3)
- [x] 1.6 Companion at low follows the flip

## Phase 2: first-launch setup

- [x] 2.1 strings.setup and strings.flip for fa, en, es, it with a completeness test
- [x] 2.2 Narrator over speechSynthesis
- [x] 2.3 Setup surface; personalize reopens it
- [x] 2.4 Setup buttons cancel `contextmenu` and take `user-select: none` (R5.6)
  - Test in `setupSurface.dom.test.ts`: a `contextmenu` event on a language button and on a vision
    button is `defaultPrevented`
  - Files: `apps/web/src/setup/setupOptions.ts`, `apps/web/src/styles/setup.css`
- [x] 2.5 The setup sheet owns one history entry for the Android back gesture (R5.7)
  - Inject a `HistoryLike` (`pushState`, `back`, `popstate` subscription) through the setup control,
    so tests use a fake history and `main.ts` passes `window.history` and `window`
  - Tests: opening pushes exactly one entry, and reopening an open sheet pushes no second one;
    `popstate` closes an open sheet once vision is set; `popstate` while vision is unset keeps the
    sheet open and pushes again; closing by a choice or by Escape calls `back()` once, and the
    `popstate` that follows does nothing; unmount removes the listener
  - Files: `apps/web/src/setup/setupControl.ts`, `apps/web/src/setup/setupHistory.ts` (new),
    `apps/web/src/setup/setupSurface.ts`, `apps/web/src/testing/testContext.ts`, `apps/web/src/main.ts`

## Phase 3: Spanish and Italian

- [x] 3.1 Shortcuts in es and it; every entry has every profile language
- [x] 3.2 One language list for personalize and setup

## Phase 3b: app readiness (R8)

Files: `apps/web/public/**`, `apps/web/index.html`, `apps/web/src/main.ts`, `packages/strings`
(additive). Tests live in `apps/web/src/app/`; `apps/web/src/styles/manifest.test.ts` is edited
because the requirement changed. 3b.7 is the one exception to the file list, as R8.4 allows.

- [x] 3b.1 Manifest for packaging (R8.1)
  - Test first: the manifest has the R8.1 fields; background_color and theme_color are "#000000";
    icons list 192 "any", 512 "any" and 512 "maskable" as separate entries, every file exists and its
    PNG header matches its stated size; index.html's `theme-color` meta matches the manifest
  - Draw the maskable icon from `icon.svg` with the orb inside the central 80%; render all PNGs with
    headless Chrome as before
- [x] 3b.2 Offline page (R8.2.2, R8.2.4)
  - Test first: `strings.offline` has a non-empty line for each of fa, en, es, it, and
    `public/offline.html` shows exactly those lines with matching `lang` and `dir`, black
    background, yellow text, and no external resources
- [x] 3b.3 Service worker (R8.2)
  - Test first, in node, running `public/sw.js` against fake `self`, `caches` and `fetch`: install
    caches only `/offline.html`; activate removes older caches; a failed navigation answers with
    the cached page; a successful navigation answers with the network response; non-navigation
    requests are not intercepted at all
- [x] 3b.4 Register `/sw.js` from `main.ts` when `navigator.serviceWorker` exists; ignore
  rejections. Checked by typecheck and a build, since `main.ts` is the wiring edge
- [x] 3b.5 Digital asset links (R8.3)
  - Test first: `public/.well-known/assetlinks.json` parses, names `app.yazd.companion`, the
    `handle_all_urls` relation and the placeholder fingerprint
  - Confirm `npm run build -w @mahmood/web` copies it to `dist/.well-known/assetlinks.json`
- [x] 3b.6 Installability check (R8.5)
  - With a production build served over HTTPS or on localhost: DevTools → Application → Manifest
    shows no installability errors, and the service worker is activated with only `/offline.html`
    cached. Offline reload shows the offline page. `git diff --stat` shows only the 3b files
- [x] 3b.7 Page `theme-color` meta follows vision (R8.4)
  - Test first in `applyProfile.dom.test.ts`: full sets the meta to `--bg` from `tokens.css`; low,
    minimal and unset set it to black

## Phase 4: polish (only if 1–3 green before 3:00 PM)

- [x] 4.1 Reduced motion: no white frame
- [x] 4.2 Hint at low
- [x] 4.3 Screenshots at 390×844
- [x] 4.4 Screenshots at 360×800 and 412×915 for every vision level and both setup steps, no
  horizontal scroll at either width

## Phase 5: voice-first onboarding

- [x] 5.1 Server `detectLanguage`: Arabic script → fa, Latin greetings table for en, es, it
- [x] 5.2 Server LLM language detector with one `detect_language` tool; transcriber selected by key
- [x] 5.3 `POST /transcribe` returns `{ text, language }`, no orchestrator, no events
- [x] 5.4 Web transcribe client and `/transcribe` dev proxy
- [x] 5.5 Voice session `capture()`, `listen()` and `cancel()`
- [x] 5.6 Welcome: yellow orb and a sentence rotating through four languages
- [x] 5.7 Hello sets the language; the vision question is spoken and answered aloud
- [x] 5.8 No language heard → four lines saying so and the four language buttons
- [x] 5.9 Reopening setup starts at the spoken vision question
