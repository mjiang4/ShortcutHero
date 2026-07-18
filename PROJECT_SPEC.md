# Shortcut Hero — Hackathon Product Spec

**Platform:** Browser, targeting Chrome on macOS with a US-QWERTY keyboard  
**Build:** Client-side static site; no backend or account required

## 1. Product

Shortcut Hero is a 3D browser game that makes learning real Linear keyboard shortcuts faster and more fun. It is inspired by the urgency and visual satisfaction of Guitar Hero, but it is a memorization game rather than a strict rhythm game.

An action such as **Go to Inbox** travels down a perspective highway. The player enters its shortcut—`G → I`—before it reaches the strike line. Correct answers build score and combos, intensifying the visuals with particles, light, and impact effects.

The first version teaches Linear shortcuts. Shortcut packs for products such as Excel, Notion, and Superhuman can be added later through data, without changing the game itself.

### Target player

A Linear user who understands common actions but has not yet built automatic shortcut recall.

### MVP goal

A polished 45-second run that is immediately understandable, visually impressive, and complete enough for a one-minute hackathon demonstration.

### Not in scope

- Linear login, API access, or workspace changes
- Accounts, backend storage, multiplayer, or mobile
- Music import, automatic beat detection, chart authoring, or a level editor in the hackathon MVP
- Windows, Linux, non-US layouts, or broad browser support
- Exact Guitar Hero mechanics or a lane for every keyboard key

## 2. Core experience

### Title and menu flow

The opening is a dedicated, full-screen game title state—not a landing page or settings dashboard. A quiet atmospheric background carries one vertical text menu:

- **Start** — immediately launches with the last-used settings
- **High Scores**
- **How to Play**
- **Options**
- **Credits**

Options open as a compact sub-screen with one setting per line. Difficulty, guidance, pace, session length, music, and effects remain configurable, but are visually secondary to starting the game. Title, options, gameplay, pause, and results are separate full-screen states and never overlap.

See [DESIGN_IDENTITY.md](./DESIGN_IDENTITY.md) for the screen architecture and art direction.

### Action Highway

A single 3D runway recedes into the distance. Minimal action ribbons move toward a strike line positioned above a simplified Mac keyboard.

- The action name is the focal point: `Go to Inbox`.
- With Learn guidance, the ribbon also shows `G → I` and the relevant keyboard keys glow.
- With Recall guidance, only the action name is shown.
- The keyboard reacts to physical input but is not divided into note lanes.
- Correct input depresses the relevant keys and resolves the ribbon with a satisfying impact.
- One prompt is playable at a time; up to two future prompts may be visible for depth and anticipation.

### Game loop

1. Choose settings and start the game.
2. Complete a short countdown.
3. Read each approaching action and enter its shortcut before the deadline.
4. Build score, combo, and visual intensity through correct answers.
5. Missed shortcuts return later in the run for another attempt.
6. Finish on a results screen after approximately 45 seconds.

The run never ends early. Mistakes reset the combo but become practice opportunities.

## 3. Modes and settings

Difficulty controls the kind of input. Assistance controls whether the answer is visible. Speed controls how long the player has to respond.

### Difficulty

| Mode | Shortcut type | Example |
|---|---|---|
| **Novice** | Single key | `P` — Change priority |
| **Medium** | Ordered sequence | `G → I` — Go to Inbox |
| **Hard** | Shift chord | `⇧ E` — Set estimate |

For the judged demo, a mixed run may use all three types. Normal games use the selected difficulty.

### Guidance

| Mode | Behaviour |
|---|---|
| **Learn** | Shows the shortcut and highlights the required keys |
| **Recall** | Shows only the action; reveals the answer after a miss |

### Speed

| Mode | Audio tempo | Prompt travel time |
|---|---:|---:|
| Focus | 140 BPM | 1.6 seconds |
| Fast | 180 BPM | 1.0 second |
| Turbo | 220 BPM | 0.8 seconds |

Speed does not change the music or the type of shortcut being tested.

## 4. Gameplay and feedback

### Input rules

- A single shortcut completes on one key press.
- A sequence must be entered in order, with no more than roughly one second between keys.
- A chord completes when the letter is pressed while Shift is held.
- A wrong key breaks the combo, but the player may recover before the ribbon reaches the line.
- A timeout is a miss.

### Scoring

- Faster correct answers earn more points.
- Consecutive first-attempt answers build the combo and score multiplier.
- A recovered answer earns reduced points, does not continue the combo, and is
  recorded as missed in the round summary.
- A miss earns no points and returns that shortcut later in the run.
- Recall guidance maintains a separate high score from Learn guidance.

The results screen shows:

- Score
- Accuracy
- Longest combo
- Unique shortcuts answered correctly on the first attempt
- Every shortcut the player knew, with clean attempts and perfect hits
- Every shortcut missed or recovered, with its missed-action count

### Visual escalation

The game is minimal while idle and becomes more expressive as the player succeeds:

- **Normal hit:** key depression, impact ring, short particle burst, and confirmation sound
- **Combo 3:** brighter ribbon trail
- **Combo 6:** denser particles and a subtle camera push
- **Combo 9 — Flow State:** brighter runway, stronger bloom, and a larger impact effect
- **Miss:** the ribbon fragments and the scene briefly loses intensity

Flow State is a visual reward only. It does not change timing or input rules.

## 5. Visual and audio direction

The game should feel like a cinematic command journey rather than a software training dashboard. Linear remains an influence in precision, typography, and violet accent—not a template for the screen layout.

The working direction is **Golden Signal**: an action highway suspended in a warm dusk environment that develops into an electric violet night. The title uses a sparse, typography-led game menu. During play, successful shortcuts change the environment, music layers, lighting, and camera energy.

### Principles

- One clear focal point at all times
- Warm dusk-to-night environment, off-white text, Linear violet signals, and restrained semantic hit colors
- Large, highly legible action text
- Sparse HUD showing score, combo, and remaining time
- A visible dramatic arc from ignition through acceleration and Flow State to a final release
- Restrained effects during normal play; world-scale reactions at combo and session milestones
- No rainbow lanes, simulated concert stage, crowd, avatar, or copied Linear UI
- Theme values kept configurable so the palette and effects can change later

### Audio and music

The hackathon MVP uses one bundled background track plus hit, miss, combo, and results sounds. The track should support the run's dramatic arc, while gameplay timing remains deterministic and does not require beat synchronization.

The post-MVP music design supports three sources behind a shared playback interface:

1. A bundled licensed, original, or public-domain recording with authored timing markers
2. A local MP3, WAV, or M4A selected by the player and played entirely in-browser
3. An experimental user-provided YouTube URL played through the official embedded player

Classical compositions such as Liszt's *Sonata in B minor* are suitable creative references. Public-domain composition status does not make every recording public domain; bundled recordings must be appropriately licensed, commissioned, or generated from a public-domain score using licensed instruments.

Arbitrary and YouTube tracks initially use **Free play**: the music accompanies the run, but prompts are not scored against its beat. **Charted** tracks may later include beat and act markers that control cue spawns and visual progression. YouTube audio must not be downloaded or extracted, and its player timing should not be treated as frame-accurate.

See [DESIGN_IDENTITY.md](./DESIGN_IDENTITY.md#7-music-identity-and-future-track-support) for the proposed track model and constraints.

## 6. Shortcut content

The [KeyCombiner Linear collection](https://keycombiner.com/collections/linear/) is a useful starting list, but it contains stale and context-dependent entries. Every shortcut included in the game should be checked against current Linear documentation or Linear's in-app `?` shortcut panel.

### Starter deck

| Difficulty | Actions |
|---|---|
| Novice | `C` New issue; `A` Assign user; `I` Assign to me; `L` Add label; `P` Change priority; `S` Change status; `F` Filter; `X` Select; `J` Next item; `K` Previous item |
| Medium | `G→I` Inbox; `G→M` My issues; `G→B` Backlog; `G→V` Active cycle; `O→F` Favorite; `O→P` Project; `O→C` Cycle; `O→T` Team |
| Hard | `⇧E` Set estimate; `⇧P` Add to project; `⇧C` Add to cycle; `⇧S` Subscribe; `⇧V` Display options; `⇧F` Clear last filter |

Some shortcuts depend on context, such as having an issue selected. When context matters, show a small label such as **Issue selected** below the action.

### Browser safety

For the MVP:

- Use only unmodified letter keys, letter sequences, and Shift-plus-letter chords.
- Exclude Command, Control, Option, Tab, Space, Enter, and browser/system shortcuts.
- Capture keys only during active play and only when the game has focus.
- Pause and clear input state if the window loses focus.

## 7. MVP build

### Must have

- Dedicated title screen with Start, High Scores, How to Play, Options, and Credits
- Compact options sub-screen with difficulty, guidance, pace, session, music, and effects
- One 45-second mixed showcase run
- Action Highway and reactive 3D keyboard
- Single, sequence, and Shift-chord input handling
- Score, accuracy, combo, multiplier, and results
- Hit, recovered, and miss states
- Particle bursts, keyboard reactions, combo escalation, and Flow State
- Simple background audio and sound effects
- Verified starter shortcut deck
- Static deployment that works after a hard refresh

### Technical direction

- Vite, React, and TypeScript
- Three.js through React Three Fiber, with Drei for text/helpers
- Lightweight bloom through `@react-three/postprocessing`
- `performance.now()` for prompt timing
- `localStorage` for high scores and missed-shortcut history
- Static deployment; no server required
- Audio playback begins from the Start gesture; future sources share a `GameTrack`/playback abstraction

### Build order

1. Make one ribbon move and accept one correct shortcut.
2. Add the complete session loop, three input types, scoring, and results.
3. Add the keyboard, particles, camera feedback, and combo escalation.
4. Add the verified content, title/menu states, audio, persistence, and deployment polish.

If time runs short, cut missed-shortcut persistence, multiple speed presets, and background workspace reactions first. Do not cut the core input loop, Learn/Recall guidance distinction, clear visual feedback, or complete results screen.

## 8. One-minute demo

1. Show the dedicated title screen and briefly open the compact Options menu.
2. Start a Learn-guided mixed showcase run.
3. Demonstrate a single key, sequence, and Shift chord.
4. Build a combo until the visual intensity changes.
5. Miss one shortcut, then clear it when it returns.
6. Finish on Results and point out Recall guidance and future shortcut packs.
