# Frontend and design

## Visual source of truth

See [DESIGN_IDENTITY.md](./DESIGN_IDENTITY.md) (**Golden Signal**). This page maps that identity onto code modules and tool accents.

## Screen architecture

Full-viewport exclusive states (never stacked dashboards):

```text
Title → Start Run → Countdown → Gameplay → Results
  ├── High Scores / Leaderboard
  ├── How to Play
  ├── Options
  └── Credits
```

| State | Primary code |
|---|---|
| Title / shell | `app/ShortcutHeroGame.tsx`, system screens |
| Options | `app/components/settings/` |
| Gameplay scene | `app/components/game/GameScene.tsx` |
| Keyboard instrument | `KeyboardInstrument.tsx` |
| HUD / pause / results | `app/components/session/` |
| Legal | `app/privacy`, `app/terms`, `LegalPage` |

## Stack responsibilities

- **DOM/React** — menus, HUD type, results, settings, leaderboard chrome
- **R3F / Three** — highway world, cues, particles, camera
- **Postprocessing** — bloom earned by hits/combos; respect reduced effects
- **CSS / Tailwind** — typography, menus, tool theme variables

## Tool accents

Base palette stays Golden Signal (night, dusk, paper, gold). Tool themes from `app/tools/themes.ts` tint:

- Highway rails / cue emissives
- Bloom accent
- Results / title chrome accents

Never sacrifice cue readability for brand color.

## Motion and accessibility

- Prefer short, consequential motion (hit impact, streak break) over constant noise.
- Honor `effectsMode`: `full` | `system` | `reduced` and `use-system-reduced-motion`.
- Reduced mode: drop heavy bloom, shake, dense particles; keep timing feedback.
- All title/options/pause/results actions keyboard-operable.

## HUD rules

Answer only: score, time remaining, combo (emphasize on change), guidance on the cue. No card chrome on the highway.

## Performance budget (demo target)

Sustain ~60 fps on a typical modern MacBook at the demo viewport with full effects. Profile before adding permanent post stacks.

## Do / don’t (implementation)

**Do:** exclusive full-screen states; luminous cues; tool accents as tokens.  
**Don’t:** SaaS marketing layouts; card grids in the hero/highway; permanent max bloom.
