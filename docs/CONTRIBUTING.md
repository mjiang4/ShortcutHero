# Contributing

## Branch model (`michael` review workflow)

1. **Develop on `michael`.** This branch is the reviewable overhaul for teammates.
2. **Do not merge `michael` → `main` until explicit approval.** `main` may diverge; port patterns carefully rather than surprise-merging.
3. Open PRs **into `michael`** (or share the branch) for incremental review if the team prefers stacked reviews.
4. After approval, a separate integration PR to `main` can be planned.

## Local loop

```bash
npm install
npm run db:local:setup
npm run dev
npm run check
```

Details: [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md).

## Change expectations

- Prefer small, reviewable commits with clear intent.
- **Ship code + docs together** when behavior, schema, API, or UX contracts change.
- Update [DECISIONS.md](./DECISIONS.md) when locking a cross-cutting choice.
- Do not commit secrets, local `.wrangler/state`, or personal env files.

## Code style

- Match existing TypeScript patterns (readonly payloads, narrow validators).
- Keep `app/game/` pure where possible; put React in `gameplay/` / `components/`.
- Tracks are data modules — do not special-case tools inside the session core.

## PR checklist

- [ ] `npm run check` passes
- [ ] D1 migration included if schema changed + local apply verified
- [ ] Relevant `docs/` pages updated
- [ ] Manual smoke for touched flows (see [TESTING.md](./TESTING.md))
- [ ] Notes for reviewers: what to click, known gaps vs planned phases

## Review focus areas

Reviewers on `michael` should especially verify:

- Leaderboard correctness and rate limits
- Track/theme readability (Linear / Slack / Spotify)
- Progressive speed feel
- Keyboard-only operability
- Docs accuracy vs shipped code
