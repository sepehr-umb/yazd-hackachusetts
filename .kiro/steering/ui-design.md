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
| `--radius-card` | `24px` | tiles, sheets, caption cards |
| `--radius-button` | `28px` | buttons, fields |
| `--gap` | `16px` | spacing unit |
| `--dur-press` | `180ms` | press feedback |
| `--dur-state` | `400ms` | state morphs |
| `--dur-breathe` | `4s` | idle breathing period |
| `--ease` | `cubic-bezier(.2,.8,.2,1)` | every transition |

## Type

`system-ui`. Base 22px. Shortcut label 30px/700, sublabel 18px/500 `--ink-muted`. Captions:
original 36px/700, English 26px. Status line 24px.

## Accessibility rules

- Every interactive target is at least 88px on each side.
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

Single column, phone-portrait first, no horizontal scroll at 360px. Top to bottom:

1. Shortcut grid: 2 columns, each tile at least 120px tall; 3 columns from 900px.
2. The companion: about 44vmin, round.
3. The status line under it.
4. Captions.
5. The text box, slim, at the bottom.

The personalize button sits bottom-end, round, fixed.

## Icons

Simple inline SVG strokes drawn in code (handset, bulb, screen), `stroke="currentColor"`,
`aria-hidden="true"`. No brand logos or brand names anywhere. The word is "Call", never a messaging
brand.

## Code pattern

Follow the face: pure, tested modules compute parameters; a thin renderer draws them. Frame loops
take injected `requestFrame`/`cancelFrame`. DOM behavior is tested in `*.dom.test.ts` with the
fakes in `apps/web/src/testing/testContext.ts`; math in plain unit tests. `apps/web/src/face/**`
is read-only.
