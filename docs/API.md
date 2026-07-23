# API

All routes are vinext App Router handlers under `app/api/`. They run on the Cloudflare Worker and expect the `DB` D1 binding.

Unless noted, bodies are JSON. Responses use `application/json`.

## Shared helpers

| Module | Role |
|---|---|
| `app/api/request.ts` | Read/limit JSON bodies; invalid JSON responses |
| `app/persistence/round-payload.ts` | Validate `RoundWritePayload` |
| `app/persistence/server.ts` | Visitor verify/create, round batch, leaderboard fetch, prune |
| `app/security/rate-limit.ts` | D1-backed write limits |

## `POST /api/rounds`

Persists a completed run: visitor upsert, round insert, mastery upserts, leaderboard row.

### Request body (`RoundWritePayload`)

| Field | Rules |
|---|---|
| `roundId` | `r_` + 32 hex |
| `visitorId` | `v_` + 32 hex |
| `deletionToken` | `d_` + 64 hex |
| `displayName` | `[\w .'-]{2,24}` |
| `trackId` | `[a-z0-9][a-z0-9_-]{0,63}` |
| `runMode` | `highway` \| `speed_round` |
| `difficulty` | `easy` \| `medium` \| `hard` |
| `guidance` | `novice` \| `pro` |
| `pace` | `relaxed` \| `standard` \| `turbo` |
| `sessionSeconds` | `30` \| `45` \| `60` |
| `soundEnabled` | boolean |
| `effectsMode` | `full` \| `system` \| `reduced` |
| `score`, combos, attempts, … | Bounded integers / accuracy 0–100 |
| `durationMs` | 0–180000 |
| `mastery` | ≤100 deltas; totals must match round aggregates |

Max body size: **64 KiB**.

### Responses

| Status | Body | Meaning |
|---|---|---|
| 201 | `{ status: "created" }` | Inserted |
| 200 | `{ status: "duplicate" }` | Same round already stored |
| 400 | `{ error }` | Invalid JSON or payload |
| 403 | `{ error }` | Visitor token mismatch |
| 429 | rate-limit headers | Too many writes |
| 503 | `{ error }` | D1 unavailable |
| 500 | `{ error }` | Insert failure |

### Rate limit

`ROUND_WRITE_LIMIT`: **20** writes / visitor / **5 minutes** (`app/security/rate-limit.ts`).

## `GET /api/leaderboard`

Public read of top scores.

### Query params

| Param | Default | Meaning |
|---|---|---|
| `track` | (all) | Filter by `trackId` |
| `mode` | (all) | Filter by `runMode` |
| `limit` | `25` | Max rows (parsed as number) |

### Response

```json
{
  "entries": [
    {
      "id": "...",
      "displayName": "Pilot-a1b2",
      "score": 12000,
      "accuracyPct": 94.5,
      "longestCombo": 12,
      "trackId": "linear",
      "runMode": "highway",
      "difficulty": "medium",
      "completedAt": 1710000000000
    }
  ]
}
```

Headers: `cache-control: no-store`.

| Status | Meaning |
|---|---|
| 200 | Entries (may be empty) |
| 503 | D1 unavailable (`entries: []`) |
| 500 | Unexpected failure (`entries: []`) |

## Client submit path

`app/persistence/round-client.ts` builds the payload from results + identity and `POST`s to `/api/rounds`. Gameplay must remain playable if the request fails.

## Planned / optional routes

Patterns from other branches or future work (document when landed):

- Progress fetch / delete-my-data
- Referral code issuance
- Dynamic score-card image routes

Until present on `michael`, treat them as non-shipping.

## Error philosophy

- Validate early; never trust client aggregates without cross-checks (mastery totals).
- Prefer idempotent round writes (duplicate → 200).
- Never leak whether a visitor id exists beyond token verification failure.
