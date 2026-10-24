# How we used Kiro to build yazd

yazd is a voice-first assistant for people who cannot use a smartphone. We arrived with a working core and 412 tests. Everything built at the event was built with Kiro. Main ended the day at 1,263 tests.

## 1. Kiro tools

- **IDE.** All specs and bug fixes. TDD needs a tight loop of fail, pass, run the app, and the IDE gave us that.
- **CLI.** `kiro-cli chat --no-interactive` reviewed the last 10 commits on main against our steering. It found zero code comments, no untested behavior changes, and two edits outside their owner's area.
- **Web.** Enrico had no local Node or Git setup. In Kiro Web he made the server serve the built web app, so one Render service runs the whole demo. Same steering, same TDD, no setup.

## 2. Spec-driven development

Seven specs: `settings-agent`, `clock`, `ui-companion`, `ui-access`, and three bug fix specs.

- **Settings agent.** Kiro expanded our brief with edge cases nobody would demo. We cut them in review. Review also surfaced a real problem: slowing Web Audio playback drops pitch, which distorts speech for an elderly listener. "Preserve pitch" became a requirement.
- **Clock.** One prompt starting with `#extensions` produced a spec that ran on Autopilot in 12 minutes. That proves our extension story: a new ability, specced, tested and merged from one prompt.
- **UI.** The `ui-access` spec added three vision modes and a voice-first setup that detects the user's language from "hello." Kiro also corrected our brief: a text color we picked failed our own 7:1 contrast rule.
- **Bug fix mode.** Silent speech traced to a disabled logger hiding the real error. Failures now get explained in the user's language. Follow-up answers now count, so "Call Ahmadi" then "Hossein" places the call.

Specs gave us a plan to review before any code existed. Vibe chat handled small jobs like deploy changes and prompt fixes.

## 3. Hooks

A Post Task Execution hook runs `npm test && npm run lint && npm run typecheck` after every spec task. It is a shell command, so it costs no credits, and it catches failures when a task finishes instead of at merge.

## 4. Steering

`product.md`, `tech.md` and `structure.md` load always. The key strategy was a team ownership table in `structure.md`: three people ran Kiro in parallel, and Kiro flagged every edit outside its owner's area. `extensions.md` is a manual recipe for adding an ability, loaded with `#extensions`. `ui-design.md` holds the design tokens and accessibility rules for every UI change.

## 5. MCP

A fetch MCP server let Kiro query MassGIS data in chat. In Massachusetts' 2,316 Environmental Justice block groups, about 1 in 9 households is limited-English (roughly 127,000 households, ACS 2015-2019). Kiro found our field names were wrong, adapted, and flagged that the layer was not statewide, so we scoped the claim. Details are in `docs/language-access-stat.md`.

## 6. Property-based testing

fast-check covers rules that must hold for every input: settings stay in bounds, reset always restores defaults, invalid input never changes state, and the event guard rejects malformed events. When we removed a check to make sure the test could fail, fast-check found `{"name":"captionSize","value":false}`, a case no hand-written test would have tried.

## 7. Powers

The GitGuardian ggshield power scanned all 193 commits and found 0 secrets. The app records voice and runs on a paid API key, so a leak would have been a privacy risk.
