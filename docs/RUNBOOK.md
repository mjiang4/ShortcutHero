# Runbook

Operational playbook for common Shortcut Hero failures. Prefer evidence (status codes, Wrangler logs, browser console) before speculative fixes.

## Leaderboard empty

1. Confirm `GET /api/leaderboard` returns 200 with `entries: []` vs 503.
2. If 503: D1 binding missing — check Worker env / local `db:local:setup` + restart `npm run dev`.
3. If 200 empty: complete a run and watch `POST /api/rounds` — expect 201.
4. Verify payload `trackId` / `runMode` filters on the UI match stored rows.
5. Confirm migrations applied (`drizzle/` journal vs remote).

## Round submit fails

| Symptom | Check |
|---|---|
| 400 | Payload validation — compare with `round-payload.ts` |
| 403 | Identity mismatch — clear/recreate anonymous identity |
| 429 | Rate limit — wait window (~5 min) or inspect `rate_limits` |
| 503 | D1 unavailable |
| 500 | Worker logs; duplicate race should become 200 `duplicate` |

## Migration apply fails locally

1. Use `wrangler.local.jsonc` and `--persist-to=.wrangler/state`.
2. Inspect `drizzle/meta/_journal.json` for conflicts.
3. As a last resort on **local only**, wipe `.wrangler/state` and re-apply (destroys local scores).

## Share broken

1. Confirm secure context (HTTPS or localhost) for `navigator.share` / clipboard.
2. Fallback path should copy text; verify permissions.
3. Score-card image routes — if unimplemented, hide UI or show “coming soon”.

## WebGL / black scene

1. Chrome console for context loss / shader errors.
2. Disable heavy postprocessing temporarily (`effectsMode: reduced`).
3. Verify `GameScene` still mounts outside R3F error boundaries (`GameRuntimeBoundary`).

## Audio silent

1. Ensure unlock happened on user gesture.
2. Check mute + system tab mute.
3. Pace changes should not leave transport stopped permanently.

## High CPU / low FPS

1. Reduced effects mode.
2. Cap particle counts during Flow State.
3. Profile with Chrome Performance; watch GC from per-frame allocations.

## Privacy deletion request

1. Client can clear local identity keys.
2. Server delete endpoint — when present, require deletion token; confirm cascade from `visitors` to rounds/leaderboard/mastery.
3. If endpoint missing, document manual D1 delete for ops with visitor id + token hash verification.

## Escalation data to capture

- Branch SHA (`michael`)
- Request URL + status
- Round id / visitor id (**never** deletion token)
- Wrangler / Worker log excerpt
- Browser + OS
