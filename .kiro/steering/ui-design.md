---
inclusion: fileMatch
fileMatchPattern: "apps/web/**"
---

# UI design system

Warm, calm, soft: a lamp in a living room, not a dashboard. The reference user is an elderly
Farsi speaker with near-total vision loss and limited dexterity. Voice is the main interface; the
screen is secondary and must never intimidate or make anyone hunt for a button.

## Tokens

Defined once as CSS custom properties on `:root` in `apps/web/src/styles/tokens.css`. Never
hardcode a color, radius or duration elsewhere.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FBF6EE` | page background |
| `--surface` | `#FFFDF9` | tiles, sheets, fields |
| `--ink` | `#2B2520` | all text |
| `--ink-muted` | `#5A4E45` | sublabels (darkened from `#6B5E54`, which is 5.8:1 on `--bg`) |
| `--accent` | `#F2A65A` | companion, primary fills |
| `--accent-deep` | `#D9734A` | focus ring, pressed borders |
| `--listening` | `#E8B04B` | listening ring |
| `--thinking` | `#C9A66B` | thinking gradient |
| `--error` | `#C8553D` | error tint and borders, never text |
| `--ok` | `#6E9F6B` | success borders, never text |
| `--radius-card` | `24px` | sheets, caption cards |
| `--radius-tile` | `20px` | shortcut tiles |
| `--radius-button` | `28px` | sheet buttons |
| `--tile-call`, `-pressed`, `-icon` | `#FBE3D0`, `#F6C9A6`, `#C8553D` | call tiles |
| `--tile-light`, `-pressed`, `-icon` | `#FBEFC6`, `#F4DF94`, `#B8860B` | light tiles |
| `--tile-tv`, `-pressed`, `-icon` | `#DDEAD9`, `#C3DABD`, `#4F7D4B` | TV tiles |
| `--shadow-tile` | `0 2px 8px rgb(120 80 40 / .10)` | tiles, header and drawer chips |
| `--header`, `--field`, `--icon-button` | `56px`, `56px`, `44px` | header bar, text box, round icon buttons |
| `--line-soft` | `--ink-muted` at 30% | text box border |
| `--gap` | `16px` | spacing unit |
| `--dur-press` | `180ms` | press feedback |
| `--dur-state` | `400ms` | state morphs |
| `--dur-breathe` | `4s` | idle breathing period |
| `--ease` | `cubic-bezier(.2,.8,.2,1)` | every transition |

## Type

`system-ui`. Base 22px. Weight 600 for every emphasis, never 700; the only exception is the full-screen
status word at minimal vision (800). Headings and legends take `letter-spacing: -0.01em`.

- Header name 20px/600. Shortcut label 22px/600 `--ink`, one line with ellipsis; sublabel 18px/500
  `--ink-muted`, from 768px only.
- Companion hint 18px `--ink-muted`. Status line 24px.
- Captions: original 36px/600, English 28px (one size larger at low vision: 48 / 36).
- Setup sheet: question 28px/600, option title 24px/600, description 18px at 70% opacity.

## Accessibility rules

- Every interactive target is at least 88px on each side, with two exceptions for sighted helpers:
  the 44px header control and the 44px send button inside the text box. The 88px shortcut tiles,
  the companion and the 96px setup buttons are the targets the reference user relies on.
- Focus ring: 4px solid `--accent-deep`, offset 4px, on `:focus-visible`.
- Text contrast at least 7:1 on `--bg`. `tokens.test.ts` enforces it for `--ink` and `--ink-muted`.
- Never color alone for meaning: every state also has text in the status line or a label.
- Every label comes from data or `packages/strings` and renders with `dir="auto"`. Data keyed by
  language also sets `lang` on the element.
- Layout uses logical properties only (`inline`/`block`, `inset-inline-end`, `margin-inline`), so
  RTL works without extra rules. No `left`/`right`.

## Motion

- Presses scale to `.96` over `--dur-press`.
- State changes morph over `--dur-state`.
- Idle breathing follows `--dur-breathe` (0.25 Hz).
- `prefers-reduced-motion: reduce` disables breathing, rings and spinning; only opacity fades remain.

## Layout

Single column, phone portrait first, no horizontal scroll at 360px. The companion is the hero: at
375×812 the header, grid, whole companion with its hint, the status line and the text box all fit
without scrolling.

1. Header, 56px: the companion's name at the start, the personalize control as a 44px round icon at
   the end. It belongs to the personalize surface and sits first with `order: -1`.
2. Shortcut grid: 2 columns, 12px gap, tiles 88px tall, icon at the start of a single-line label;
   3 columns from 900px. Tiles are tinted by kind; pressed scales to .96 and deepens the tint.
3. The companion: `min(56vmin, 300px)` on phones, `min(40vmin, 380px)` from 768px, centered. A 10px
   halo at 30% of the accent is always visible and breathes with the orb; while listening it turns
   `--listening` and expands. A filled microphone in `--accent-deep` at 30% shows only when idle.
4. Directly under it, the hint: "Tap to talk" in the profile's language, replaced by the status word
   while a session runs. The status line below carries replies and errors; it is visually hidden
   while a session runs and while empty, and always stays in the accessibility tree.
5. Captions, when there are any.
6. The text box: a 56px pill, 1px `--line-soft` border, with a 44px round arrow send button inside at
   the end; it sits 16px above the safe area.

The Details drawer (debug only) is a 36px chip at the bottom end, above the text box (at the very
bottom at minimal vision), never full width when closed, growing upward when opened.

The setup sheet stays black and yellow. Content is vertically centered: a 120px yellow orb (no
behavior), the question centered at max 24ch, then 96px buttons 24px apart with start-aligned text,
24px padding and a chevron at the end; vision options carry a one-line description.

## Icons

Simple inline SVG drawn in code: filled shapes for the shortcut kinds (handset, bulb, screen), the
microphone and the send arrow, `fill="currentColor"`; the personalize sliders keep strokes. Always
`aria-hidden="true"`. No brand logos or brand names anywhere. The word is "Call", never a messaging
brand.

## Code pattern

Follow the face: pure, tested modules compute parameters; a thin renderer draws them. Frame loops
take injected `requestFrame`/`cancelFrame`. DOM behavior is tested in `*.dom.test.ts` with the
fakes in `apps/web/src/testing/testContext.ts`; math in plain unit tests. `apps/web/src/face/**`
is read-only.

## Phone rules

The shipped form is an Android app: the deployed HTTPS site wrapped as a Trusted Web Activity
(PWABuilder or Bubblewrap, outside this repo). Nothing native enters the repo. Chrome on Android
comes first, Safari on iPhone second.

- Design for portrait at Android 360×800 and 412×915, and iPhone 390×844 and 430×932. Landscape must
  not break but is not optimized.
- Viewport meta carries `viewport-fit=cover`; pad edges with `env(safe-area-inset-*)`. Use `100dvh`,
  never `100vh`.
- `touch-action: manipulation` on everything interactive; `-webkit-tap-highlight-color:
  transparent`. The full-screen button also gets `user-select: none` and `-webkit-touch-callout:
  none` so a long press shows no system menu.
- All audio starts inside the tap. The voice session resumes the AudioContext there;
  `speechSynthesis` is also called from the gesture. Chrome on Android also requires a prior tap
  before `navigator.vibrate` works; every haptic follows one.
- Works with TalkBack and VoiceOver: every control is a real `<button>` with an `aria-label` from strings; state
  changes go to a `role="status"` live region.
- Never more than one flash per state change and never more than three flashes in any second.
- The full-screen button and the setup buttons cancel `contextmenu`, so a long press on Android
  shows no selection menu.
- Haptics use `navigator.vibrate` first (Chrome on Android). The iOS switch toggle is a fallback.
- An open setup sheet owns one history entry, so the Android back gesture closes the sheet, not the
  app.

## Vision levels and the flip

- The profile's `vision` (`full`, `low`, `minimal`) decides which surfaces mount, through the pure
  `settingsFor(profile)`. Unset means only the setup sheet.
- Brightness carries the signal, not hue: `--flip-idle` (default `#000000`) when idle,
  `--flip-listening` (default `#FFE600`) while recording, one 120 ms `--flip-flash` (`#FFFFFF`) frame
  on each change. Ink is chosen by luminance, so it stays readable on any caregiver color.
- `prefers-reduced-motion: reduce` changes color instantly with no white frame.
