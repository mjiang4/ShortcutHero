# Testing

## Commands

| Command | Scope |
|---|---|
| `npm run test:unit` | Node tests via `tsx --test` on listed files |
| `npm run test:render` | `vinext build` + `tests/rendered-html.test.mjs` |
| `npm test` | unit + render |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run check` | lint + typecheck + test |

## Unit tests (current pattern)

Registered in `package.json` `test:unit` (extend the list when adding files):

- `app/game/session.test.ts` — FSM, scheduling, tempo
- `app/api/request.test.ts` — JSON body helpers
- `app/persistence/round-payload.test.ts` — payload validation
- `app/tools/registry.test.ts` — track registry

Add focused tests for:

- Progressive tempo factor monotonicity
- Interlude scheduling
- Leaderboard query filters
- Tool deck uniqueness / showcase membership

## Browser tests

Playwright specs under `tests/browser/`:

- `game-flow.spec.ts`
- `onboarding.spec.ts`
- `options.spec.ts`
- `launch-compatibility.spec.ts`

Helpers live in `tests/browser/helpers.ts`. Prefer stability over pixel-perfect snapshots for WebGL.

## Manual QA checklist (review builds)

- [ ] `db:local:setup` + `dev` — round submit creates leaderboard row
- [ ] Duplicate round submit returns duplicate, not 500
- [ ] Learn vs Recall guidance
- [ ] Pace + progressive ramp feel
- [ ] Slack/Spotify theme accents readable
- [ ] Mute / reduced effects / reduced motion
- [ ] Keyboard-only title → options → start → pause → results
- [ ] D1 down path: game still playable

## CI expectations

`npm run check` should pass before asking for `michael` review. Browser suite may be local/CI-optional depending on runner GPU; document any skip reasons in the PR.
