# Mini-games

Mini-games extend Shortcut Hero beyond a single continuous highway act. They share shortcut content and identity/persistence, but may use different timing UIs and scoring emphasis.

## Two delivery shapes

| Shape | How players reach it | `runMode` |
|---|---|---|
| **Standalone** | Title → Quick Play / Speed Round | `speed_round` |
| **Interlude** | Inserted during a highway run | Still attributed to the parent run; burst itself is speed-round style |

## Shared result contract

```ts
type MiniGameResult = {
  score: number;
  accuracy: number; // 0–100
  durationMs: number;
};
```

Interludes fold score into the highway run total (product rule TBD in implementation — document the chosen weight in DECISIONS when locked). Standalone rounds submit their own D1 row with `runMode: "speed_round"`.

## Speed round (v1)

**Fantasy:** Command flash → timed key fire × N.

1. Show action (Learn shows keys; Recall hides).
2. Short accept window.
3. Next prompt immediately.
4. End screen with accuracy + streak stats.

Suitable for interludes of **3–5** prompts with large motion beats, then return to the highway at the **current tempo factor**.

## Highway interlude scheduling

Planned session acts:

```text
act: "highway" | "interlude"
```

Triggers (product options — pick one primary for MVP):

- Every N highway cues, or
- Wall-clock timer within the session

Rules:

- Pause highway scrolling and input matcher for highway cues.
- Run interlude full-screen.
- Resume highway without resetting combo unless the interlude miss policy says otherwise (default: interlude misses break combo).

## Streak visuals

Chain build / break FX apply in both highway and mini-game contexts (particles, camera punch, SFX). See [GAME_DESIGN.md](./GAME_DESIGN.md).

## Leaderboard implications

Filter boards by `runMode` so highway legends and speed-round specialists do not overwrite each other unintentionally. UI should label the mode.

## Non-goals (current)

- Physics toys unrelated to shortcuts
- Competitive real-time PvP (see extension E7)
- Mini-games that require live Slack/Spotify APIs

## Status on `michael`

Design + `runMode` persistence fields are in place; full interlude scheduler and Quick Play UX land in the mini-games implementation phase. Keep this doc updated when scheduling constants ship.
