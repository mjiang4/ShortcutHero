# Glossary

| Term | Meaning |
|---|---|
| **Action / cue** | A playable prompt showing a shortcut action (e.g. “Go to Inbox”) moving down the highway. |
| **Strike line / strike gate** | The threshold where timing is judged; correct input “hits” the cue. |
| **Highway** | The 3D runway cues travel along (`runMode: highway`). |
| **Track** | A tool’s shortcut library (Linear, Slack, Spotify…). Identified by `trackId`. |
| **Deck** | The set of shortcuts for one difficulty (`easy` / `medium` / `hard`) or `showcase`. |
| **Showcase** | Curated alternating mix for demos and first-run teaching. |
| **Assistance / guidance** | `novice` (Learn — show keys) vs `pro` (Recall — hide keys). |
| **Pace / speed** | `relaxed` / `standard` / `turbo` — base approach duration and audio BPM. |
| **Tempo factor** | Multiplier that ramps approach/cadence over a session (progressive speed). |
| **Combo / streak** | Consecutive clean hits; drives score multiplier and visual tiers. |
| **Combo tier** | `base` → `trail` (3+) → `surge` (6+) → `flow` (9+). |
| **Judgement** | Hit quality: `perfect`, `good`, `early`, `late`, or `miss`. |
| **Clean hit** | Correct on first attempt without recovery. |
| **Recovered** | Correct after a wrong key before timeout; reduced score, breaks combo. |
| **Interlude** | Mini-game segment inserted inside a highway run. |
| **Speed round** | Flash → timed key responses; standalone or interlude (`runMode: speed_round`). |
| **Visitor** | Anonymous client identity (`v_…`) stored in D1 `visitors`. |
| **Deletion token** | Client secret (`d_…`) hashed server-side to prove ownership for writes/deletion. |
| **Round** | One completed session persisted to `rounds` (+ mastery deltas, leaderboard row). |
| **Mastery** | Per-visitor per-shortcut aggregate counters in `shortcut_mastery`. |
| **Tool theme** | Accent tokens (`accent`, `highway`, `bloom`, …) layered on Golden Signal. |
| **Golden Signal** | Working visual direction: dusk → violet finale highway world. |
| **vinext** | Vite-based Next App Router runtime used for local/dev and Cloudflare deploy. |
| **D1** | Cloudflare SQLite database bound as `DB`. |
| **`michael` branch** | Review branch for this overhaul; not auto-merged to `main`. |
