# Architecture Decision Records

Lightweight ADRs for Shortcut Hero. Append new records; do not rewrite history—supersede with a new ADR.

---

## ADR-001: Develop and review on `michael` before `main`

- **Status:** Accepted
- **Date:** 2026-07-23
- **Context:** The overhaul should be reviewable by teammates without forcing an immediate merge into `main`, which may contain divergent production work.
- **Decision:** Ship the wishlist on branch **`michael`**. Merge to `main` only after explicit approval. Port useful patterns from `main` by copy/adapt, not by surprise merge.
- **Consequences:** Temporary divergence; careful cherry-picks; docs must state branch workflow ([CONTRIBUTING.md](./CONTRIBUTING.md)).

---

## ADR-002: Cloudflare D1 for international leaderboards

- **Status:** Accepted
- **Date:** 2026-07-23
- **Context:** Need shared high scores locally and in production—not browser-only personal bests.
- **Decision:** Use **Cloudflare D1** with Drizzle schema/migrations. Local path via Wrangler (`npm run db:local:setup`). Persist rounds, leaderboard entries, mastery, and rate limits.
- **Consequences:** Requires migration discipline; gameplay must degrade gracefully when D1 is unavailable (503 on APIs, client continues).

---

## ADR-003: Anonymous visitors (no mandatory auth in MVP)

- **Status:** Accepted
- **Date:** 2026-07-23
- **Context:** Friction-free play for demos and review builds.
- **Decision:** Client-generated `visitorId` + `deletionToken`; server stores token hash only. Optional auth deferred to extension **E3**.
- **Consequences:** Weaker anti-cheat; identity loss if storage cleared; deletion UX must be documented.

---

## ADR-004: Shortcut packs are content, not live SaaS APIs

- **Status:** Accepted
- **Date:** 2026-07-23
- **Context:** Multi-tool fantasy (Linear/Slack/Spotify) without OAuth scope creep.
- **Decision:** Author static decks + visual themes. No live Slack/Spotify/Linear API calls in MVP. OAuth-assisted practice is **E5**.
- **Consequences:** Shortcuts may drift from upstream products; hard mode may approximate Cmd+Shift chords as Shift+letter for the engine.

---

## ADR-005: Per-tool theme accents on Golden Signal

- **Status:** Accepted
- **Date:** 2026-07-23
- **Context:** Players should feel tool identity without forking the whole art direction.
- **Decision:** Keep Golden Signal as base ([DESIGN_IDENTITY.md](./DESIGN_IDENTITY.md)); apply `TOOL_THEMES` tokens (`accent`, `accentSoft`, `highway`, `bloom`, `label`).
- **Consequences:** Scene/CSS must read theme centrally; readability QA per tool required.

---

## ADR-006: Highway interludes + standalone mini-games

- **Status:** Accepted
- **Date:** 2026-07-23
- **Context:** Desire for both quick modes and mid-run variety.
- **Decision:** Support standalone speed rounds and timed interludes inside highway runs. Persist `runMode` (`highway` | `speed_round`) for boards.
- **Consequences:** Scheduling/scoring rules must stay documented in [MINI_GAMES.md](./MINI_GAMES.md); risk of mode confusion if UI labeling is weak.

---

## ADR-007: vinext + Workers as the application host

- **Status:** Accepted
- **Date:** 2026-07-23
- **Context:** Project already targets vinext with Cloudflare Vite plugin and Worker entry.
- **Decision:** Continue with **vinext** (Vite + Next App Router shape) on Cloudflare Workers—not a classic Node `next start` production host.
- **Consequences:** Local DX depends on Wrangler/Miniflare; docs must not claim “static-only / no database.”

---

## ADR-008: Server validates aggregates; client owns simulation

- **Status:** Accepted
- **Date:** 2026-07-23
- **Context:** Re-simulating the highway on the server is expensive and brittle.
- **Decision:** Client is source of run simulation; server validates payload shape/bounds and mastery reconciliation, then stores.
- **Consequences:** Determined cheaters can inflate scores until E3 soft anti-cheat; acceptable for MVP review.

---

## ADR-009: Enterprise docs live under `docs/`

- **Status:** Accepted
- **Date:** 2026-07-23
- **Context:** Root markdown sprawl drifts from the stack (vinext, D1, multi-track).
- **Decision:** Maintain the enterprise suite under `docs/`; root README stays a short onboard + pointer. Update docs in the same change set as features.
- **Consequences:** Contributors must learn the index; outdated root stubs should only redirect.
