# Audio

Procedural Web Audio powers music beds and hit SFX. Primary implementation: `app/audio/game-audio.ts` (`ShortcutHeroAudio`) and `app/audio/use-game-audio.ts`.

## Design goals

- Unlock only after a **user gesture** (`unlock()` / `start()`).
- Couple perceived energy to **pace BPM** and **hit streak**.
- Separate buses for **music** vs **effects** with a master gain.
- Mute path must silence both buses without tearing down the session.

## Tempo map

| Pace | BPM |
|---|---:|
| `relaxed` | 140 |
| `standard` | 180 |
| `turbo` | 220 |

Custom numeric tempos clamp to roughly 80–220 BPM. Progressive highway tempo factor may later drive transport rate; keep music musically stable if visual ramp outpaces comfort.

## Scheduling

Internal scheduler (~25 ms) schedules ahead (~0.12 s) using oscillators and filtered noise buffers — no external audio assets required for MVP.

## Hit feedback

Hit quality (`early` | `good` | `perfect` | `late`) and streak length shape pitched confirmations. Misses drop intensity / play a shear cue. Combo tiers can introduce additional layers.

## Settings

- `soundEnabled` persisted with other options and sent on round write.
- UI mute toggles call into the audio facade; never leave a dangling AudioContext in a broken state after rapid remounts.

## Future sources (design only)

DESIGN_IDENTITY describes bundled / local file / experimental YouTube free-play sources. Those are **not** required for the `michael` MVP. Keep one `GameTrack` interface when introducing them so gameplay state stays source-agnostic.

## Testing notes

Audio is hard to unit-assert in Node. Prefer:

- Facade method spies in hook tests where useful
- Manual checklist: gesture unlock, mute, pace change mid-run, tab blur behavior
