# Shortcut Hero Production Launch Plan

## Goal

Launch Shortcut Hero publicly from a custom domain, make the first-run experience reliable, understand whether people learn and return, and add a lightweight referral loop without slowing down the core game.

## Product success criteria

- A new visitor can understand and start a game without outside instructions.
- Supported desktop users can complete a round without browser-shortcut conflicts.
- Mobile, Windows, and unsupported-browser visitors receive a useful fallback instead of a broken game.
- Every production deploy passes lint, type checking, unit tests, browser tests, and the production build.
- We can measure landing, onboarding, first-game completion, replay, sharing, and referral conversion.
- Product data survives across sessions where durability is required.
- The game remains playable without signing in.
- AI is kept outside latency-sensitive gameplay and added only where it creates clear user value.

## Stack decision

| Capability | Launch choice | Notes |
| --- | --- | --- |
| Hosting | Codex Sites / Cloudflare Workers | Matches the existing Vinext and Cloudflare configuration. |
| Framework | Vinext, React, TypeScript | Keep for launch; pin and test upgrades carefully because Vinext is experimental. |
| Database | Cloudflare D1 with Drizzle | Referrals, durable round summaries, and mastery data. |
| File storage | Cloudflare R2, later | Only when custom tracks, documents, audio, or generated assets require blobs. |
| Analytics | PostHog Cloud | Product events, funnels, sampled replay, flags, and initial error context. |
| Authentication | None at launch | Anonymous play is the default. Consider Clerk only for cross-device progress or user-owned tracks. |
| AI | OpenAI Responses API, later | Server-side only, strict structured outputs, caching, rate limits, and review. |
| CI | GitHub Actions | Lint, typecheck, unit tests, browser tests, and build. |

## Architecture rules

1. Core game timing, scoring, matching, and difficulty remain deterministic.
2. Rendering cannot own game-state transitions.
3. Analytics calls go through one typed adapter and never live directly in components.
4. Browser storage is for local preferences and temporary state only.
5. D1 is the source of truth for referrals and durable progress.
6. No raw keystrokes, names, emails, or shortcut-entry sequences are sent to analytics.
7. Authentication remains optional until it unlocks a concrete product workflow.
8. AI never runs during a timed round and never decides whether an answer is correct.
9. Every refactor is behavior-preserving and lands separately from product changes.
10. Every execution step ends with verification and a focused commit.

## Order of operations

### 0. Checkpoint current product — complete

- Commit the onboarding, options confirmation, hidden keyboard mode, and slower pacing.
- Confirm the worktree is clean before production work begins.

Acceptance:

- A named commit contains the current playable baseline.

### 1. Establish the quality gate — complete

- Add explicit `typecheck`, unit-test, rendered-route-test, and combined `check` scripts.
- Make the TypeScript test runner a direct development dependency instead of relying on a transitive package.
- Add GitHub Actions for clean install, lint, typecheck, tests, and build.
- Cache npm dependencies without caching build output.
- Document the single local command that reproduces CI.

Acceptance:

- `npm run check` passes locally from the committed repository.
- Pull requests cannot merge when a quality step fails.
- CI does not require production secrets.

### 2. Protect critical behavior with browser tests — complete

- Add browser tests for onboarding, system confirmation, guide, main menu, options confirmation/cancel, countdown, pause/resume, results, and retry.
- Add one test proving Command, Control, and Option browser shortcuts are not captured.
- Add one reduced-motion test and one unsupported-device test.

Acceptance:

- The primary first-run-to-results path is covered.
- Tests can run headlessly in CI without audio output or a dedicated GPU.

### 3. Refactor the application controller — complete

- Extract session lifecycle, timing loop, keyboard input, audio coordination, result persistence, and feedback into focused hooks/modules.
- Split the HUD, pause menu, results screen, and result analytics into components.
- Keep `ShortcutHeroGame` as orchestration rather than implementation.

Acceptance:

- No gameplay behavior changes.
- Existing engine and browser tests stay green.
- `ShortcutHeroGame.tsx` has one clear responsibility and is materially smaller.

### 4. Refactor the 3D scene — complete

- Split world, highway, cues, strike gate, particles, and feedback effects.
- Centralize scene constants and visual-performance settings.
- Audit resource cleanup for geometries, materials, timers, and post-processing.
- Replace deprecated Three.js APIs encountered during the extraction.

Acceptance:

- Visual output and timing remain equivalent.
- Starting and ending repeated rounds does not create unbounded resource growth.
- Reduced-effects mode avoids unnecessary post-processing work.

Note: Three.js `Clock` deprecation output currently originates in React Three
Fiber `9.6.1`, the latest published version, rather than application code.

### 5. Refactor onboarding, menus, and styles — complete

- Split onboarding, main menu, options, scores, and credits.
- Extract platform detection, local profile persistence, high-score access, and keyboard-menu navigation.
- Move feature styles out of the global stylesheet into feature-level styles.

Acceptance:

- First-run and returning-user behavior remain unchanged.
- Keyboard-only navigation remains complete.
- Local-storage keys and migrations are centralized.

### 6. Add production failure handling — complete

- Add route and global error boundaries.
- Add WebGL-unavailable, audio-unavailable, and reduced-performance fallbacks.
- Add explicit loading behavior for the 3D route.
- Add safe recovery to the title screen.

Acceptance:

- A rendering or audio failure never leaves a blank page.
- Users can return to the menu after a recoverable failure.

### 7. Handle launch traffic correctly — complete

- Detect physical-keyboard capability and supported operating systems.
- Give mobile visitors a polished explanation, share action, and “open on desktop” flow.
- Tell Windows users clearly that the current track uses a Mac keyboard layout.
- Add Safari, Chrome, and Firefox compatibility checks on macOS.

Acceptance:

- Unsupported visitors see a deliberate product experience.
- Supported visitors reach the game with minimal friction.

### 8. Add typed analytics — complete; project token pending deployment

- Add one analytics interface with a no-op local implementation and a PostHog production implementation.
- Define event names and properties in TypeScript.
- Track anonymous visitors until authentication exists.
- Add one launch funnel dashboard and one replay/retention dashboard.
- Mask inputs and sample session replay only after privacy review.

Core events:

- `onboarding_started`
- `onboarding_completed`
- `game_started`
- `game_completed`
- `game_abandoned`
- `personal_best_achieved`
- `results_viewed`
- `share_prompt_shown`
- `share_clicked`
- `share_link_copied`
- `referral_landing`
- `referred_player_completed_round`

Acceptance:

- Events contain no direct personal data.
- Development and tests work without PostHog credentials.
- Client and server events share one anonymous visitor identity.

Decision gate:

- Confirm PostHog region, project key, replay policy, and retention before production enablement.

Decision: PostHog US, 12-month product-event retention, and session replay off.
Capture remains disabled until the production project token is supplied.

### 9. Add D1 persistence — complete

- Enable the logical D1 binding.
- Define and generate reviewed migrations.
- Add server-side storage for visitors, rounds, and mastery, plus the referral schema used by the next phase.
- Keep settings and transient UI state local.
- Make writes idempotent and validate all server input.

Initial tables:

- `visitors`
- `rounds`
- `shortcut_mastery`
- `referral_codes`
- `referral_conversions`

Acceptance:

- Round and mastery records are stored server-side and survive reloads and browser restarts.
- Local development uses a reproducible database setup.
- Migrations are committed and included in deployment artifacts.

Decision: raw rounds expire after 90 days; aggregate mastery and referrals expire
after 12 months. Anonymous progress can be deleted only with a private secret
stored on the originating device.

### 10. Build the referral loop — complete

- Generate random, non-sequential referral codes.
- Accept `?ref=` links and store first-touch attribution.
- Show the referral prompt after a personal best, the third completed round, or a strong-accuracy result.
- Use Web Share when available and copy-to-clipboard otherwise.
- Count conversion only after the referred visitor completes a round.
- Prevent self-referrals and repeated conversion credit.
- Frequency-cap the prompt.

Suggested copy:

> Know someone who should learn keyboard shortcuts? Send them this challenge.

Acceptance:

- Referral landings and completed-round conversions are attributable.
- Sharing works without authentication.
- The prompt is not shown after every round.

Implementation: first-touch attribution is stored anonymously, same-visitor
self-referrals and repeated conversion credit are rejected server-side, and the
results prompt is capped to once every three completed rounds.

### 11. Add security, privacy, and observability — complete

- Resolve actionable dependency advisories.
- Add security headers and a Content Security Policy compatible with analytics and WebGL assets.
- Add rate limits to writes and future AI endpoints.
- Add privacy and terms pages.
- Define log redaction and analytics data rules.
- Add production error capture with release and route context.

Acceptance:

- No high or critical production dependency findings.
- Secrets are server-only and represented in `.env.example` without values.
- Error reports and replay do not contain typed names or shortcut inputs.

Implementation: production dependencies audit clean; remaining moderate audit
findings are isolated to Drizzle's local migration CLI. CSP and browser headers,
bounded request parsing, D1-backed write limits, direct privacy/terms pages,
confirmed deletion, and sanitized manual error capture are in place.

### 12. Prepare the Twitter launch surface — next

- Regenerate the Open Graph/Twitter image to match the current game.
- Update stale metadata and image alt text.
- Add canonical URL, robots, sitemap, favicon validation, and share-card checks.
- Create a short public explanation and demo flow.
- Add a mobile-safe landing view for Twitter traffic.

Acceptance:

- Twitter/X, Slack, iMessage, and LinkedIn render a current, legible preview.
- The launch URL is canonical and uses the production domain.

### 13. Deploy and launch

- Run the complete quality gate.
- Deploy a private/preview build and smoke-test the real runtime.
- Verify production analytics separately from local analytics.
- Connect the custom domain.
- Approve public access explicitly.
- Publish and monitor onboarding completion, game completion, errors, and shares.

Decision gate:

- Ask for the final domain and explicit public-deployment approval.

### 14. Post-launch authentication

Add authentication only when users need cross-device progress, saved custom tracks, public profiles, or ownership.

If still on Vinext/Cloudflare, complete a small Clerk compatibility spike before committing to the SDK. Keep all gameplay public and make sign-in an upgrade path.

### 15. Post-launch AI

Prioritize these in order:

1. Custom track importer: documentation or CSV to a validated `ShortcutTrack` schema.
2. Short cached mnemonics for repeatedly missed shortcuts.
3. Internal duplicate detection, normalization, and track review tools.

Requirements:

- Server-side API key only.
- Strict structured outputs.
- Independent schema and shortcut validation.
- Human review before public track publication.
- Per-user rate limits, cost ceilings, caching, and prompt versioning.
- No model call during timed gameplay.

Decision gate:

- Confirm model budget, data policy, and whether imported source material may be sent to an external model.

## Launch blockers

- Current product changes committed.
- Quality gate and one browser happy-path test passing.
- Supported-device gating.
- Error and WebGL fallback.
- Fresh Twitter card and metadata.
- Typed launch analytics.
- Referral sharing and attribution.
- Privacy page and replay decision.
- No high or critical dependency findings.
- Production URL, custom domain, and explicit public-deployment approval.

## Deferred by default

- Required accounts
- Public leaderboards
- User-generated public tracks
- Uploaded music or YouTube playback
- AI-generated gameplay
- Payments
- Multiplayer
- Native mobile gameplay
