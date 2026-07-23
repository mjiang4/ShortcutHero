# Analytics

## Posture

Analytics must stay compatible with anonymous play and privacy pages:

- No account emails required
- Prefer first-party event names with coarse properties
- Never send deletion tokens, raw key logs, or message content
- Respect “do not track” / opt-out if wired

## Intended client pipeline

Target shape (implement or restore on `michael` as needed):

| Piece | Role |
|---|---|
| Event catalog | Stable string names + typed payloads |
| Client bootstrap | Load once from root layout / game shell |
| Sink | Console in dev; optional PostHog or similar in prod via env |

## Suggested event set

| Event | When | Properties (examples) |
|---|---|---|
| `app_opened` | Shell mounts | `tool`, `branch` build metadata |
| `run_started` | Session start | `trackId`, `difficulty`, `guidance`, `pace`, `sessionSeconds`, `runMode` |
| `run_finished` | Results | `score`, `accuracyPct`, `longestCombo`, `durationMs` |
| `round_submit_result` | After `POST /api/rounds` | `status` (`created`/`duplicate`/`error`/`unavailable`) |
| `leaderboard_viewed` | Board opens | `trackId`, `mode` |
| `share_clicked` | Share affordance | `method` (`navigator`/`clipboard`/`download`) |
| `demo_skipped` / `demo_completed` | First-visit demo | — |
| `tool_selected` | Tool picker | `trackId` |

## Property rules

- Enumerate difficulties/paces; do not free-text PII.
- Bucket continuous values if needed (e.g. score tiers) for privacy.
- Include `runMode` so highway vs speed-round funnels stay separable.

## Relationship to D1

D1 stores **gameplay truth** for leaderboards and mastery. Analytics stores **product funnels**. Do not treat analytics as a backup database.

## Compliance

Align copy with `app/privacy` and [SECURITY_AND_PRIVACY.md](./SECURITY_AND_PRIVACY.md). If a vendor SDK is added, document retention and subprocessors there.
