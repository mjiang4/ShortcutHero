# Product overview

**Shortcut Hero** is a 3D browser game that builds keyboard-shortcut muscle memory. Action cues race down a Guitar Hero–inspired highway; the player presses the matching shortcut at the strike line, chains accurate hits, and reviews what to practise after each round.

## Problem

People learn shortcuts through docs, tooltips, or accident. That is slow. Shortcut Hero turns the same material into timed active recall with combo feedback, sound, and a clear round summary.

## Players

- Primary: power users of tools like Linear, Slack, and Spotify who know the actions but not the keys
- Secondary: teams onboarding new hires onto keyboard-heavy workflows
- Demo / review audience: teammates evaluating the `michael` branch build

## Core loop

1. Choose tool track, difficulty, guidance, pace, and session length.
2. Optional skippable first-visit demo (planned / in progress on `michael`).
3. Countdown → highway run (and optional interlude mini-games).
4. Results: score, accuracy, best combo, known vs practice list.
5. Persist round + leaderboard entry to Cloudflare D1; optional share.

## Modes (product language)

| Product label | Engine meaning |
|---|---|
| Novice | Easy deck — single-key shortcuts |
| Medium | Medium deck — ordered key sequences |
| Hard | Hard deck — Shift chords |
| Mix / Showcase | Alternating input kinds for demos |
| Learn | Shows the shortcut on the cue (`assistance: novice`) |
| Recall | Hides the answer until miss (`assistance: pro`) |
| Focus / Fast / Turbo | Pace presets (`relaxed` / `standard` / `turbo`) |

Session lengths: **30 / 45 / 60** seconds. Progressive tempo can ramp approach speed within a run (see [GAME_ENGINE.md](./GAME_ENGINE.md)).

## Tool tracks

Shortcut libraries are **content packs**, not live product APIs.

| Track | Status on `michael` |
|---|---|
| Linear | Available (reference track) |
| Slack | Deck + theme authored |
| Spotify | Deck + theme authored |
| Notion, Jira, Superhuman, Excel | Planned (catalog stubs) |

Per-tool accents sit on top of the Golden Signal base look ([DESIGN_IDENTITY.md](./DESIGN_IDENTITY.md), [TOOLS_AND_TRACKS.md](./TOOLS_AND_TRACKS.md)).

## Run modes

| `runMode` | Intent |
|---|---|
| `highway` | Full action-highway session (default) |
| `speed_round` | Standalone or interlude flash-fire mini-game |

## Platform targets

- Browser (Chrome-first), physical **macOS** US-QWERTY keyboard
- Hosted on **Cloudflare** via **vinext** (Vite + Next App Router shape) with **D1** for rounds and leaderboards
- No account required for MVP: anonymous visitor identity + deletion token

## Explicit non-goals (current phase)

- Live Slack / Spotify OAuth or workspace mutation
- Full Windows / Linux / mobile parity
- Exact Guitar Hero lane-per-key mechanics
- Merging `michael` → `main` before teammate review approval

## Related docs

- [GAME_DESIGN.md](./GAME_DESIGN.md) — feel and clarity goals
- [EXTENSION_PHASED_PLAN.md](./EXTENSION_PHASED_PLAN.md) — long-horizon roadmap
- [DECISIONS.md](./DECISIONS.md) — locked product/engineering ADRs
