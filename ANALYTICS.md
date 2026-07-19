# Shortcut Hero analytics

## Status

The typed analytics client is implemented. Local development, tests, and
production builds without credentials use a no-op adapter. Production PostHog
capture starts only when both the project token and host are configured.

Launch policy: use PostHog US, keep session replay off, and retain product
analytics events for 12 months. Review this policy after the first 90 days of
real traffic.

## Production configuration

Set these build-time environment variables:

```bash
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_POSTHOG_REPLAY_ENABLED=false
NEXT_PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE=0.05
```

The launch project must be created in PostHog US so its project token matches
the configured ingestion host.

## Privacy rules

- Never capture a name, email, action label, shortcut, or pressed key.
- Capture only typed enums, booleans, counts, timing summaries, and scores.
- Keep PostHog person profiles disabled while play is anonymous.
- Keep autocapture and automatic page events disabled.
- If replay is approved, mask all inputs, block the 3D canvas, and record no
  network headers or bodies.
- PostHog and D1 use the same app-owned anonymous visitor ID. A separate,
  device-held deletion secret authorizes progress deletion.

The runtime sanitizer drops forbidden personal and shortcut-input fields even
if they are accidentally passed around the typed boundary.

## Event contract

| Event | When |
| --- | --- |
| `onboarding_started` | First-run onboarding appears. |
| `onboarding_completed` | The guide is completed. |
| `game_started` | Countdown ends and deterministic play begins. |
| `game_completed` | A timed round finishes. |
| `game_abandoned` | An active round is restarted, left for the title, or exited. |
| `personal_best_achieved` | A local high score is replaced. |
| `results_viewed` | Results are shown after a completed round. |
| `share_prompt_shown` | A qualified results referral prompt appears. |
| `share_clicked` | A share control is used. |
| `share_link_copied` | Clipboard fallback succeeds. |
| `referral_landing` | A valid referral parameter is accepted. |
| `referred_player_completed_round` | An attributed visitor completes a round. |

## Dashboard definitions

Create these after the PostHog project exists.

### Launch funnel

1. `onboarding_started`
2. `onboarding_completed`
3. `game_started`
4. `game_completed`
5. A second `game_started`

Use a 24-hour conversion window. Break down by `launch_support`, `difficulty`,
`guidance`, and `pace`. Add completion time, abandonment reason, and share-click
trends beside the funnel.

### Learning and retention

- Daily and weekly unique players using `game_started`.
- Round completion rate: `game_completed / game_started`.
- Immediate replay rate: `game_started` where `run_number > 1`.
- Median `accuracy_pct`, `longest_combo`, and `unique_shortcuts_correct`.
- Personal-best rate and completed rounds per anonymous visitor.
- Day-1 and day-7 return cohorts after the first `game_completed`.

## Approved launch policy

- Region: PostHog US.
- Product analytics retention: 12 months.
- Session replay: off.
- Future error-log retention: 30 days.
- Anonymous raw round retention in D1: 90 days.
- Referral attribution and aggregate mastery retention: 12 months.

Production capture still requires the public project token and a privacy notice
review before deployment.
