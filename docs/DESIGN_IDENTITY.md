# Shortcut Hero — Design & Visual Identity

**Status:** Visual source of truth (maintained under `docs/`)  
**Working direction:** **Golden Signal**  
**Branch note:** Accents for Linear / Slack / Spotify layer on this base — see [TOOLS_AND_TRACKS.md](./TOOLS_AND_TRACKS.md) and `app/tools/themes.ts`.  
**Reference hierarchy:** Design Waterloo shell; SummerHacks atmosphere; Rez Infinite world; Thumper impact; Tetris Effect escalation

## 1. Creative premise

Shortcut Hero should feel like entering and conducting a living command network—not operating a training dashboard.

The player travels through an abstract world at golden hour. Every correct shortcut stabilizes the route, adds energy to the music, and transforms the environment from quiet dusk into an electric violet finale. The story is environmental rather than verbal:

> Enter the flow. Build momentum. Bring the system fully alive.

The game remains minimal and legible, but minimal does not mean static. Drama comes from anticipation, consequence, escalation, and release.

## 2. Experience architecture

Each major state occupies the full viewport. Screens never visually overlap.

```text
Title → Start Run → Countdown → Gameplay → Results
  ├── High Scores
  ├── How to Play
  ├── Options
  └── Credits
```

### Title screen

The title screen is a game state, not a marketing landing page or settings form.

- Full-screen atmospheric scene or animated texture
- Small Shortcut Hero wordmark
- One vertical text menu: **start**, **high scores**, **how to play**, **options**, **credits**
- `start` immediately launches with the last-used settings
- Keyboard and pointer navigation
- All menu, options, pause, and results actions work without a pointer
- Active item becomes brighter, shifts slightly, and receives a minimal cursor or underline
- No cards, feature copy, numbered sections, status chips, page header, or dashboard framing

The visual model is the supplied reference: large, quiet menu typography floating directly over a living background. The background may show the action highway at rest, but no playable prompts appear until the run starts.

### Options

Options are a compact sub-screen, not the default experience.

```text
difficulty     novice  /  medium  /  hard
guidance       learn   /  recall
pace           focus   /  fast    /  turbo
session        30s     /  45s     /  60s
music          on      /  off
effects        full    /  reduced

back
```

- Display one setting per line
- Left/right changes the selected value
- The last-used value is persisted
- A one-line explanation may appear at the bottom for the focused setting
- Avoid switches, segmented-control containers, cards, and explanatory paragraphs

### Gameplay

Gameplay is a dedicated, edge-to-edge 3D scene. It contains no site navigation or menu UI.

- The command highway and horizon own the frame
- HUD floats directly over the world without panels
- Pause opens an in-world overlay with **resume**, **restart**, **options**, and **quit to title**
- Returning to the title fully exits the run

### Results

Results are a theatrical release after the run, not an analytics dashboard.

- Score arrives first, large and centered
- Accuracy, best combo, and learned shortcuts follow in sequence
- Primary action: **play again**
- Secondary actions: **change difficulty**, **title**
- Missed shortcuts appear as a short practice list, not a table

## 3. Visual identity

### Personality

- Cinematic, focused, kinetic
- Warm rather than cyberpunk-cold
- Precise without looking corporate
- Expressive through light and motion, not interface decoration
- Confident enough to leave space empty

### Signature image

A narrow luminous highway hangs above a vast dusk landscape. The horizon moves from amber to violet. Pale command signals emerge in the distance, accelerate toward a radiant strike gate, and burst into light when played correctly.

### Palette

| Token | Value | Use |
|---|---:|---|
| Night | `#080A14` | Deepest sky and scene foundation |
| Dusk | `#19162F` | Near-field atmosphere and geometry |
| Linear violet | `#7C6CFF` | Default command signal and Linear tool accent |
| Electric violet | `#A897FF` | Perfect hits and Flow State (Linear soft) |
| Golden hour | `#F4A261` | Horizon, progression, and warmth |
| Sun | `#FFD6A3` | Highlights and title-state glow |
| Paper | `#F4F1EA` | Primary type |
| Mist | `#AAA6B4` | Secondary type |
| Perfect | `#B7F5D3` | Success confirmation only |
| Miss | `#FF706B` | Failure confirmation only |

The sky should carry most of the color. UI remains primarily Paper and Mist. Perfect and Miss colors are semantic accents, never ambient decoration.

### Per-tool accents

Golden Signal stays the world. Tool packs retint signal energy only:

| Tool | Accent | Soft / secondary | Highway energy |
|---|---|---|---|
| Linear | `#7C6CFF` | `#A897FF` | `#F4A261` |
| Slack | `#4A154B` | `#36C5F0` | `#36C5F0` |
| Spotify | `#1DB954` | `#1ED760` | `#1DB954` |

Never rely on tool color alone to communicate input kind or judgement.

### Typography

- Use one modern grotesk throughout; **Geist Sans**, **Inter**, or a similarly neutral open typeface
- Title menu: lowercase, 48–72 px, regular weight, tight leading
- Command names: 34–56 px, medium weight, optimized for a one-second read
- HUD: 13–16 px, medium weight
- Use monospace only for shortcut keycaps or timing data
- Avoid all-caps microcopy, wide letter spacing, and tiny “system terminal” labels

### Shape language

- World geometry: long rails, shards, planes, light bands, distant silhouettes
- Command objects: typography carried by light or thin geometry—not interface cards
- Strike gate: a physical threshold in the world, not a bordered rectangle
- Corners may be sharp or subtly softened by light; do not apply one global radius
- Keycaps can remain physical because their form communicates input

### Texture and material

- Soft film grain or dither gives the title screen tactility
- Atmospheric fog creates depth
- Emissive materials are reserved for active gameplay signals
- Bloom should be earned by hits and combos, not permanently applied to everything
- Avoid glass panels, generic gradients inside controls, and repeated hairline grids

## 4. The world and the action highway

### Environment

Build one reusable procedural environment rather than many bespoke levels:

- Gradient sky dome
- Low-poly cloud field, distant city, or abstract terrain silhouettes
- Highway rails and repeating light markers
- Sparse floating geometry that becomes more active with combo
- Fog and parallax layers for scale

All assets should be procedural or lightweight enough for a static browser deployment.

### Command signals

A command signal contains:

1. Action name: **Go to Inbox**
2. Optional context: **Issue selected**
3. Guidance when enabled: `G → I`

The text remains readable at all times, but its carrier should feel native to the world: a luminous sign, projected glyph, or thin signal frame. It must not resemble a web card.

Future signals may use restrained categories—navigation, issue editing, views—but color must never be the only way to identify an input.

### Strike moment

A correct hit has three layers:

1. **Contact, 0–80 ms:** command compresses into the gate; relevant keys depress
2. **Impact, 80–220 ms:** sharp sound, light flash, debris, camera impulse
3. **Consequence, 220–900 ms:** a pulse travels down the highway and changes the world

A miss passes the gate with weight: the signal shears, the camera recoils, one music layer drops, and the environment briefly desaturates. Never simply reset the object to the distance.

## 5. Dramatic arc of a run

Every run should have a beginning, build, climax, and release even when the shortcut order is procedural.

| Phase | Approx. time | World state | Audio state |
|---|---:|---|---|
| **Ignition** | 0–8 s | Quiet horizon, restrained movement | Pulse and first musical layer |
| **Acceleration** | 8–25 s | Rails brighten; scenery gains parallax | Percussion or rhythmic layer enters |
| **Flow** | 25–38 s | Sky deepens; particles and structures respond | Harmony expands with combo |
| **Overload** | Final 7–12 s | Violet night, faster camera, largest scale | Full arrangement and final push |
| **Release** | Results | Motion resolves; horizon opens | Impact, tail, then space |

Combo controls local intensity. Session time controls the global act. A new player who misses repeatedly still experiences the overall journey, while a strong player reaches its most spectacular version.

### Combo escalation

- Combo 0–2: quiet world
- Combo 3: signal trails and a new musical layer
- Combo 6: wider highway pulse and subtle camera push
- Combo 9: Flow State; stronger horizon, bloom, and particles
- Combo 12+: sustained maximum state without adding UI clutter

## 6. HUD and interaction language

The HUD answers only three questions: How am I doing? What is happening now? How long remains?

- Score: upper left
- Remaining time: a thin line or arc at the top edge
- Combo: near the strike zone, appearing strongly only when it changes
- Current shortcut guidance: attached to the command signal
- Pause affordance: upper right, visually subordinate

HUD elements use type and spacing rather than boxes. Nonessential labels disappear during Flow State.

## 7. Music identity and future track support

Music is part of the world-state system, not background decoration. Hits should contribute small tonal or percussive sounds that sit musically above the track.

### Musical direction

- Dramatic, propulsive, emotionally legible
- Classical and modern-classical material is welcome
- A 45–60 second excerpt should have a clear build and payoff
- Liszt's *Sonata in B minor* is a strong reference because it moves between tension, virtuosity, and release

The composition may be public domain while a specific recording remains copyrighted. A bundled recording must be public-domain, appropriately licensed, commissioned, or generated from a public-domain score using licensed instruments.

### Track modes

| Mode | Behaviour | Suitable sources |
|---|---|---|
| **Free play** | Music accompanies the run; cue timing remains game-defined | Any supported track or YouTube embed |
| **Charted** | Cue spawns, acts, and effects follow authored timestamps or beats | Bundled tracks with beat metadata |

Arbitrary music should begin in Free play. Automatic beat detection and chart generation are later features and should not be required for the visual redesign.

### Planned source support

1. **Bundled track:** one licensed or original dramatic track with authored act and beat markers
2. **Local file:** player selects an MP3, WAV, or M4A they have the right to use; playback remains local
3. **YouTube URL, experimental:** play through the official embedded YouTube player; do not download, proxy, or extract audio

YouTube playback has platform constraints: autoplay requires a user gesture, videos may disable embedding, advertisements can disrupt timing, and player timing is not precise enough for frame-perfect scoring. Therefore YouTube tracks use Free play unless a separate compatible chart is provided.

### Playback abstraction

The future audio implementation should expose one interface regardless of source:

```ts
type TrackSource = "bundled" | "local" | "youtube";
type SyncMode = "free" | "charted";

interface GameTrack {
  id: string;
  title: string;
  artist?: string;
  source: TrackSource;
  syncMode: SyncMode;
  durationMs?: number;
  offsetMs?: number;
  beatMarkersMs?: number[];
  actMarkersMs?: number[];
  license?: string;
  credit?: string;
}
```

Playback must begin only after the player selects **start**, satisfying browser audio policies. Music selection belongs under **options → music**, not on the title screen.

## 8. Motion and effects rules

- Every effect must communicate input, timing, combo, or world progression
- Prefer one strong impact over several simultaneous flourishes
- Camera movement is short, directional, and returns to neutral
- Use anticipation before impact: gate charge, scale compression, or audio inhale
- Maintain readable command text during all camera motion
- Reduced-effects mode removes camera shake, heavy bloom, and dense particles while preserving timing feedback

## 9. Do / do not

### Do

- Make the title screen feel like the first frame of the game
- Let success change the entire scene
- Use atmosphere and depth to create scale
- Keep commands readable at high speed
- Give every 45-second run a visible climax
- Make options accessible without making them the product's first impression

### Do not

- Recreate a SaaS pricing or onboarding page
- Put every setting in a card or segmented control
- Use particles as a substitute for consequence
- Leave the environment unchanged while the combo rises
- Copy Guitar Hero lanes, concert imagery, or another game's exact art
- Depend on arbitrary YouTube audio for accurate rhythm scoring

## 10. Redesign acceptance criteria

- The first frame is recognizable as a game title screen without explanatory copy
- Starting a run takes one action with saved settings
- Options are reachable but visually secondary
- Title, gameplay, pause, and results are distinct full-screen states
- Command signals no longer resemble web cards
- A correct hit produces contact, impact, and environmental consequence
- The environment visibly progresses through at least four acts during a run
- Combo milestones affect lighting, motion, particles, and audio layers
- Novice guidance remains readable at Turbo pace
- The scene maintains 60 fps on a typical modern MacBook at the demo viewport
- The music architecture can later accept bundled, local, and YouTube sources without changing gameplay state
